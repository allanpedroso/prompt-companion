

## Plano: Export de Documentos com Renomeacao Inteligente + Merge PDF ou ZIP

### Resumo

Duas opcoes de export por despesa: (1) **PDF consolidado** com todos os docs da despesa mergeados em um unico arquivo, ou (2) **ZIP** com cada documento individual renomeado seguindo padrao especifico por tipo. Tambem permitir export individual de cada documento. Usar `pdf-lib` para gerar PDFs e `jszip` para gerar arquivos ZIP client-side.

### Dados disponiveis no mock atual

O `Document.extracted` ja possui os campos necessarios para a nomenclatura:
- `estabelecimento`, `valor`, `data_vencimento` (boleto), `data_pagamento` (comprovante), `nf_numero` (NF/DANFE), `cnpj`
- Falta `paymentMethod` -- adicionar campo opcional `meio_pagamento` ao tipo `Document.extracted`

### Regras de nomenclatura

| Tipo | Padrao |
|------|--------|
| Boleto | `Boleto_{Vencimento}_{Estabelecimento}_{Valor}_NF{Numero}.pdf` |
| NF/DANFE | `NF_{Numero}_{MesAno}_{Estabelecimento}.pdf` ou `DANFE_...` |
| Comprovante | `Comp_{DataPgto}_{Meio}_{Estabelecimento}.pdf` |
| Recibo | `Recibo_{Data}_{Estabelecimento}_{Valor}.pdf` |

Merge consolidado: `{Estabelecimento}_{MesAno}_Boleto_Comp_NF.pdf`

### Arquivos a criar/editar

**1. Adicionar dependencias: `pdf-lib`, `jszip`**

**2. Novo: `src/lib/documentNaming.ts`**
- `sanitizeFilename(text)` -- remove caracteres invalidos
- `formatDateBR(dateStr)` -- "2025-01-10" para "10-01-2025"
- `formatMoneyBR(value)` -- 287.45 para "287,45"
- `buildDocumentFilename(doc, linkedNfNumber?)` -- retorna nome padronizado por tipo
- `buildMergeFilename(expense, docTypes[])` -- nome do PDF consolidado

**3. Novo: `src/lib/pdfExport.ts`**
- `generateDocumentPage(doc, pdfDoc)` -- cria uma pagina placeholder com metadados do documento (simulando conteudo real)
- `exportSingleDocumentPDF(doc)` -- gera e baixa um PDF individual com nome padronizado
- `exportMergedPDF(expense, docs)` -- merge todos os docs selecionados em um unico PDF, ordem: Boleto, Comprovante, NF/DANFE
- `exportDocumentsAsZip(expense, docs)` -- gera um ZIP com cada doc como PDF individual renomeado

**4. Novo: `src/components/ExportDocumentsDialog.tsx`**
- Dialog Radix aberto ao clicar "Exportar documentos" em uma despesa
- Lista cada documento vinculado com: checkbox, badge de tipo, preview do nome final calculado, valor
- Tres botoes de acao:
  - "Exportar PDF consolidado" -- merge todos (ou selecionados) em 1 PDF
  - "Exportar ZIP" -- todos (ou selecionados) como PDFs individuais dentro de um .zip
  - Icone de download individual por documento na lista
- Se nenhum doc selecionado, usa todos; se ha selecao, usa apenas os marcados

**5. Editar: `src/data/mockData.ts`**
- Adicionar `meio_pagamento?: 'pix' | 'boleto' | 'ted'` ao tipo `extracted` do Document
- Adicionar `meio_pagamento: 'pix'` ao comprovante mock (doc id 2)

**6. Editar: `src/pages/ExpensesPage.tsx`**
- Substituir o botao de download individual (que fazia CSV) pelo novo `ExportDocumentsDialog`
- Na area expandida de documentos, adicionar botao de download individual por documento
- Manter export CSV em lote no topo da pagina (funcionalidade diferente -- planilha)

### Fluxo do usuario

1. Expande uma despesa e ve os documentos vinculados
2. Clica "Exportar documentos" (icone de download na linha da despesa)
3. Dialog abre mostrando todos os docs com nomes finais previstos
4. Escolhe: PDF consolidado (merge) ou ZIP (individuais agrupados)
5. Ou clica no icone de download em um doc especifico para baixar avulso

