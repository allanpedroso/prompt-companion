import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDocuments, useReprocessDocument } from '@/hooks/useDocuments';
import DocumentTypeBadge from '@/components/DocumentTypeBadge';
import { AlertTriangle, CheckCircle, RefreshCw, Loader2, PlusCircle, Eye, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import { downloadDocumentFromStorage } from '@/lib/pdfExport';

export default function DocumentsPage() {
  const { data: documents = [], isLoading } = useDocuments();
  const reprocess = useReprocessDocument();
  const qc = useQueryClient();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [processingAll, setProcessingAll] = useState(false);
  const [generatingExpenses, setGeneratingExpenses] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<typeof documents[0] | null>(null);

  const docsWithoutExpense = documents.filter(d => !d.expense_id && (d.confidence ?? 0) >= 70 && (d.extracted as any)?.estabelecimento && (d.extracted as any)?.valor);

  const handleGenerateExpenses = async () => {
    if (docsWithoutExpense.length === 0) {
      toast.info('Todos os documentos já possuem despesas vinculadas.');
      return;
    }
    setGeneratingExpenses(true);
    let ok = 0, fail = 0;
    for (const doc of docsWithoutExpense) {
      const ext = doc.extracted as any;
      let emissaoMesAno: string | null = null;
      const dateStr = ext.data_vencimento || ext.data_pagamento;
      if (dateStr) {
        const parts = dateStr.split('/');
        if (parts.length === 3) emissaoMesAno = `${parts[1]}-${parts[2]}`;
      }

      let expenseId: string | null = null;
      const matchQuery = supabase.from('expenses').select('id, valor_total, nf_numero')
        .eq('user_id', doc.user_id).eq('estabelecimento', ext.estabelecimento);
      if (emissaoMesAno) matchQuery.eq('emissao_mes_ano', emissaoMesAno);
      const { data: existingList } = await matchQuery;

      let existing = existingList?.find(e => Math.abs(Number(e.valor_total) - Number(ext.valor)) < 0.01);
      if (!existing && ext.nf_numero) existing = existingList?.find(e => e.nf_numero === ext.nf_numero);
      if (!existing && existingList?.length) existing = existingList[0];

      if (existing) {
        const updates: Record<string, unknown> = {};
        if (Math.abs(Number(existing.valor_total) - Number(ext.valor)) >= 0.01) {
          updates.valor_total = Math.max(Number(existing.valor_total), Number(ext.valor));
        }
        if (ext.nf_numero && !existing.nf_numero) updates.nf_numero = ext.nf_numero;
        if (Object.keys(updates).length > 0) await supabase.from('expenses').update(updates).eq('id', existing.id);
        expenseId = existing.id;
      } else {
        const nome = (ext.estabelecimento || '').toLowerCase();
        const category = (() => {
          if (/copel|cemig|light|eletropaulo|energia|eletric|celpe|coelba|ampla/.test(nome)) return 'energia';
          if (/sanepar|sabesp|cedae|cagece|saneago|agua|saneamento/.test(nome)) return 'agua';
          if (/fibra|internet|banda larga|vivo|claro|tim|oi|net|gvt|telecom/.test(nome)) return nome.includes('fon') ? 'telefone' : 'internet';
          if (/aluguel|imobili/.test(nome)) return 'aluguel';
          if (/condomin/.test(nome)) return 'condominio';
          if (/mercado|supermercado|atacado/.test(nome)) return 'mercado';
          if (/posto|combustiv|shell|petrobras|ipiranga/.test(nome)) return 'combustivel';
          return 'outros';
        })();

        const { data: expData, error: expErr } = await supabase.from('expenses').insert({
          user_id: doc.user_id,
          estabelecimento: ext.estabelecimento,
          cnpj_cpf: ext.cnpj || null,
          category,
          status: ext.data_pagamento ? 'quitada' : 'pendente',
          nf_numero: ext.nf_numero || null,
          valor_total: ext.valor,
          emissao_mes_ano: emissaoMesAno,
        }).select('id').single();
        if (!expErr && expData) expenseId = expData.id;
        else { fail++; continue; }
      }

      if (expenseId) {
        await supabase.from('documents').update({ expense_id: expenseId }).eq('id', doc.id);
        ok++;
      }
    }
    setGeneratingExpenses(false);
    qc.invalidateQueries({ queryKey: ['documents'] });
    qc.invalidateQueries({ queryKey: ['expenses'] });
    qc.invalidateQueries({ queryKey: ['expenses-with-docs'] });
    toast.success(`${ok} despesa(s) criada(s)${fail > 0 ? `, ${fail} falha(s)` : ''}`);
  };

  const needsReview = documents.filter(d => (d.confidence ?? 0) < 70);
  const reviewed = documents.filter(d => (d.confidence ?? 0) >= 70);

  const handleReprocess = async (docId: string) => {
    setProcessingIds(prev => new Set(prev).add(docId));
    try {
      await reprocess.mutateAsync(docId);
      toast.success('Documento reprocessado com sucesso!');
    } catch (e: any) {
      toast.error(`Erro ao reprocessar: ${e.message}`);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  };

  const handleReprocessAll = async () => {
    const unprocessed = documents.filter(d => (d.confidence ?? 0) === 0);
    if (unprocessed.length === 0) {
      toast.info('Nenhum documento pendente de processamento.');
      return;
    }
    setProcessingAll(true);
    let ok = 0, fail = 0;
    for (const doc of unprocessed) {
      try {
        await reprocess.mutateAsync(doc.id);
        ok++;
      } catch {
        fail++;
      }
    }
    setProcessingAll(false);
    toast.success(`Processados: ${ok} sucesso, ${fail} falha(s)`);
  };

  const handleDownload = async (doc: typeof documents[0]) => {
    try {
      await downloadDocumentFromStorage(doc);
      toast.success('Download iniciado');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao baixar');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-2xl font-bold text-foreground">Revisão de Documentos</h1></div>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  const unprocessedCount = documents.filter(d => (d.confidence ?? 0) === 0).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revisão de Documentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {needsReview.length} documento(s) precisam de revisão manual
          </p>
        </div>
        <div className="flex gap-2">
          {docsWithoutExpense.length > 0 && (
            <Button onClick={handleGenerateExpenses} disabled={generatingExpenses} size="sm" className="gap-2">
              {generatingExpenses ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              Gerar Despesas ({docsWithoutExpense.length})
            </Button>
          )}
          {unprocessedCount > 0 && (
            <Button onClick={handleReprocessAll} disabled={processingAll} variant="outline" size="sm" className="gap-2">
              {processingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Reprocessar todos ({unprocessedCount})
            </Button>
          )}
        </div>
      </div>

      {needsReview.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Revisão necessária
          </h2>
          {needsReview.map((doc, i) => {
            const isProcessing = processingIds.has(doc.id);
            return (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-warning">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.original_filename}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Confiança: {doc.confidence}%</p>
                </div>
                <DocumentTypeBadge type={doc.type as any} />
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title="Visualizar"
                    onClick={() => setViewingDoc(doc)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title="Baixar"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReprocess(doc.id)} disabled={isProcessing} className="gap-1.5">
                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {isProcessing ? 'Processando...' : 'Reprocessar'}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-success" /> Processados ({reviewed.length})
        </h2>
        {reviewed.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento processado ainda.</p>}
        {reviewed.map((doc, i) => (
          <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{doc.stored_filename || doc.original_filename}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(doc.extracted as any)?.estabelecimento}
                {(doc.extracted as any)?.valor && ` · R$ ${Number((doc.extracted as any).valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{doc.confidence}%</span>
            <DocumentTypeBadge type={doc.type as any} />
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Visualizar"
                onClick={() => setViewingDoc(doc)}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Baixar"
                onClick={() => handleDownload(doc)}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      <DocumentViewerModal
        doc={viewingDoc}
        open={!!viewingDoc}
        onOpenChange={(open) => { if (!open) setViewingDoc(null); }}
      />
    </div>
  );
}
