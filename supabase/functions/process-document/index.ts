import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    // Fetch the document record
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the file from storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from("documents")
      .download(doc.file_path);

    if (dlError || !fileData) {
      console.error("Download error:", dlError);
      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64 (chunk-safe for large files)
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const isPdf = doc.original_filename.toLowerCase().endsWith(".pdf");
    const mimeType = isPdf ? "application/pdf" : "image/jpeg";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call AI with tool calling for structured extraction
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em classificação de documentos financeiros brasileiros. Analise o documento fornecido e extraia informações relevantes. Classifique o tipo e extraia os dados com precisão. Se não conseguir ler ou identificar um campo, retorne null para ele. O nível de confiança deve refletir sua certeza na classificação (0-100).`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Analise este documento financeiro. Nome do arquivo: "${doc.original_filename}". Classifique o tipo e extraia os dados.` },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_document",
              description: "Classifica um documento financeiro e extrai dados relevantes.",
              parameters: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["boleto", "comprovante", "nf", "danfe", "recibo", "unknown"],
                    description: "Tipo do documento",
                  },
                  confidence: {
                    type: "number",
                    description: "Nível de confiança na classificação (0-100)",
                  },
                  estabelecimento: {
                    type: "string",
                    description: "Nome do estabelecimento/empresa emissora",
                  },
                  valor: {
                    type: "number",
                    description: "Valor total em reais (apenas número, sem R$)",
                  },
                  cnpj: {
                    type: "string",
                    description: "CNPJ do estabelecimento",
                  },
                  data_vencimento: {
                    type: "string",
                    description: "Data de vencimento no formato DD/MM/AAAA",
                  },
                  data_pagamento: {
                    type: "string",
                    description: "Data de pagamento no formato DD/MM/AAAA, se disponível",
                  },
                  nf_numero: {
                    type: "string",
                    description: "Número da nota fiscal, se aplicável",
                  },
                  meio_pagamento: {
                    type: "string",
                    enum: ["pix", "boleto", "ted", "doc", "cartao", "outro"],
                    description: "Meio de pagamento utilizado, se identificável",
                  },
                },
                required: ["type", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_document" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiResult));
      return new Response(JSON.stringify({ error: "AI returned unexpected format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    // Update the document with extracted data
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        type: extracted.type || "unknown",
        confidence: extracted.confidence || 0,
        extracted: {
          estabelecimento: extracted.estabelecimento || null,
          valor: extracted.valor || null,
          cnpj: extracted.cnpj || null,
          data_vencimento: extracted.data_vencimento || null,
          data_pagamento: extracted.data_pagamento || null,
          nf_numero: extracted.nf_numero || null,
          meio_pagamento: extracted.meio_pagamento || null,
        },
      })
      .eq("id", document_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update document" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-create or reuse expense from extracted data
    if (extracted.estabelecimento && extracted.valor) {
      let emissaoMesAno: string | null = null;
      const dateStr = extracted.data_vencimento || extracted.data_pagamento;
      if (dateStr) {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          emissaoMesAno = `${parts[1]}-${parts[2]}`; // MM-YYYY
        }
      }

      // Check for existing expense with same user + estabelecimento + period
      let expenseId: string | null = null;
      const matchQuery = supabase
        .from("expenses")
        .select("id, valor_total")
        .eq("user_id", doc.user_id)
        .eq("estabelecimento", extracted.estabelecimento);

      if (emissaoMesAno) {
        matchQuery.eq("emissao_mes_ano", emissaoMesAno);
      }

      const { data: existingExpense } = await matchQuery.maybeSingle();

      if (existingExpense) {
        // Update existing expense: add value
        const newTotal = Number(existingExpense.valor_total) + Number(extracted.valor);
        await supabase
          .from("expenses")
          .update({ valor_total: newTotal })
          .eq("id", existingExpense.id);
        expenseId = existingExpense.id;
      } else {
        // Create new expense
        const { data: expenseData, error: expError } = await supabase
          .from("expenses")
          .insert({
            user_id: doc.user_id,
            estabelecimento: extracted.estabelecimento,
            cnpj_cpf: extracted.cnpj || null,
            category: extracted.type === "boleto" ? "boleto" : extracted.type === "nf" || extracted.type === "danfe" ? "nota_fiscal" : "outros",
            status: extracted.data_pagamento ? "quitada" : "pendente",
            nf_numero: extracted.nf_numero || null,
            valor_total: extracted.valor,
            emissao_mes_ano: emissaoMesAno,
          })
          .select("id")
          .single();

        if (!expError && expenseData) {
          expenseId = expenseData.id;
        } else {
          console.error("Expense creation error:", expError);
        }
      }

      if (expenseId) {
        await supabase
          .from("documents")
          .update({ expense_id: expenseId })
          .eq("id", document_id);
      }
    }

    return new Response(JSON.stringify({ success: true, extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
