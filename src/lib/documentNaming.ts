import type { Document, DocumentType, Expense } from '@/data/mockData';

export function sanitizeFilename(text: string): string {
  return text
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

export function formatMonthYear(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

export function formatMoneyBR(value?: number): string {
  if (value === undefined || value === null) return '';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function findLinkedNfNumber(doc: Document, allDocs: Document[]): string | undefined {
  if (doc.type !== 'boleto') return undefined;
  const nfDoc = allDocs.find(
    d => (d.type === 'nf' || d.type === 'danfe') && d.expense_id === doc.expense_id
  );
  return nfDoc?.extracted.nf_numero;
}

export function buildDocumentFilename(doc: Document, siblingDocs: Document[] = []): string {
  const ext = doc.extracted;

  switch (doc.type) {
    case 'boleto': {
      const parts = [
        'Boleto',
        formatDateBR(ext.data_vencimento),
        sanitizeFilename(ext.estabelecimento || ''),
        formatMoneyBR(ext.valor),
      ].filter(Boolean);
      const nfNum = findLinkedNfNumber(doc, siblingDocs);
      if (nfNum) parts.push(`NF${nfNum}`);
      return parts.join('_') + '.pdf';
    }
    case 'nf': {
      const parts = [
        'NF',
        ext.nf_numero || '',
        formatMonthYear(ext.data_vencimento) || '',
        sanitizeFilename(ext.estabelecimento || ''),
      ].filter(Boolean);
      return parts.join('_') + '.pdf';
    }
    case 'danfe': {
      const parts = [
        'DANFE',
        ext.nf_numero || '',
        formatMonthYear(ext.data_vencimento) || '',
        sanitizeFilename(ext.estabelecimento || ''),
      ].filter(Boolean);
      return parts.join('_') + '.pdf';
    }
    case 'comprovante': {
      const meio = ext.meio_pagamento?.toUpperCase() || 'PIX';
      const parts = [
        'Comp',
        formatDateBR(ext.data_pagamento),
        meio,
        sanitizeFilename(ext.estabelecimento || ''),
      ].filter(Boolean);
      return parts.join('_') + '.pdf';
    }
    case 'recibo': {
      const parts = [
        'Recibo',
        formatDateBR(ext.data_pagamento || ext.data_vencimento),
        sanitizeFilename(ext.estabelecimento || ''),
        formatMoneyBR(ext.valor),
      ].filter(Boolean);
      return parts.join('_') + '.pdf';
    }
    default:
      return sanitizeFilename(doc.stored_filename) + '.pdf';
  }
}

const typeShortLabels: Record<DocumentType, string> = {
  boleto: 'Boleto',
  comprovante: 'Comp',
  nf: 'NF',
  danfe: 'DANFE',
  recibo: 'Recibo',
  unknown: 'Doc',
};

export function buildMergeFilename(expense: Expense, docs: Document[]): string {
  const types = [...new Set(docs.map(d => d.type))];
  const order: DocumentType[] = ['boleto', 'comprovante', 'nf', 'danfe', 'recibo', 'unknown'];
  const sortedTypes = order.filter(t => types.includes(t));
  const typeStr = sortedTypes.map(t => typeShortLabels[t]).join('_');

  const parts = [
    sanitizeFilename(expense.estabelecimento),
    expense.emissao_mes_ano,
    typeStr,
  ].filter(Boolean);

  return parts.join('_') + '.pdf';
}
