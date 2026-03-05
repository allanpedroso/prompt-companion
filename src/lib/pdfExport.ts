import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import type { Document, Expense } from '@/data/mockData';
import { typeLabels } from '@/data/mockData';
import {
  buildDocumentFilename,
  buildMergeFilename,
  formatDateBR,
  formatMoneyBR,
} from './documentNaming';

function triggerDownload(data: Uint8Array, filename: string) {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function generateDocumentPage(
  doc: Document,
  pdfDoc: PDFDocument,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  boldFont: Awaited<ReturnType<PDFDocument['embedFont']>>
) {
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const title = typeLabels[doc.type]?.toUpperCase() || 'DOCUMENTO';
  page.drawText(title, { x: margin, y, size: 18, font: boldFont, color: rgb(0.1, 0.4, 0.3) });
  y -= 35;

  page.drawLine({ start: { x: margin, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 25;

  const lines: [string, string][] = [];
  const ext = doc.extracted;
  if (ext.estabelecimento) lines.push(['Estabelecimento:', ext.estabelecimento]);
  if (ext.cnpj) lines.push(['CNPJ:', ext.cnpj]);
  if (ext.valor !== undefined) lines.push(['Valor:', `R$ ${formatMoneyBR(ext.valor)}`]);
  if (ext.data_vencimento) lines.push(['Vencimento:', formatDateBR(ext.data_vencimento)]);
  if (ext.data_pagamento) lines.push(['Data Pagamento:', formatDateBR(ext.data_pagamento)]);
  if (ext.meio_pagamento) lines.push(['Meio Pagamento:', ext.meio_pagamento.toUpperCase()]);
  if (ext.nf_numero) lines.push(['Nº NF/DANFE:', ext.nf_numero]);
  lines.push(['Tipo Documento:', typeLabels[doc.type] || doc.type]);
  lines.push(['Arquivo Original:', doc.original_filename]);

  for (const [label, value] of lines) {
    page.drawText(label, { x: margin, y, size: 10, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(value, { x: margin + 130, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    y -= 20;
  }

  y -= 20;
  page.drawRectangle({
    x: margin, y: y - 60, width: 495, height: 60,
    color: rgb(0.96, 0.97, 0.98),
    borderColor: rgb(0.85, 0.87, 0.9),
    borderWidth: 1,
  });
  page.drawText('Documento placeholder - em producao, o conteudo real do PDF sera inserido aqui.', {
    x: margin + 15, y: y - 35, size: 9, font, color: rgb(0.5, 0.5, 0.5),
  });
}

export async function exportSingleDocumentPDF(doc: Document, siblingDocs: Document[] = []) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  await generateDocumentPage(doc, pdfDoc, font, boldFont);

  const bytes = await pdfDoc.save();
  const filename = buildDocumentFilename(doc, siblingDocs);
  triggerDownload(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }), filename);
}

export async function exportMergedPDF(expense: Expense, docs: Document[]) {
  const order = ['boleto', 'comprovante', 'nf', 'danfe', 'recibo', 'unknown'];
  const sorted = [...docs].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const doc of sorted) {
    await generateDocumentPage(doc, pdfDoc, font, boldFont);
  }

  const bytes = await pdfDoc.save();
  const filename = buildMergeFilename(expense, sorted);
  triggerDownload(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }), filename);
}

export async function exportDocumentsAsZip(expense: Expense, docs: Document[]) {
  const zip = new JSZip();
  const font_ = StandardFonts.Helvetica;
  const boldFont_ = StandardFonts.HelveticaBold;

  for (const doc of docs) {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(font_);
    const boldFont = await pdfDoc.embedFont(boldFont_);
    await generateDocumentPage(doc, pdfDoc, font, boldFont);
    const bytes = await pdfDoc.save();
    const filename = buildDocumentFilename(doc, docs);
    zip.file(filename, bytes);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const zipName = `${expense.estabelecimento}_${expense.emissao_mes_ano}_docs.zip`
    .replace(/[<>:"/\\|?*]/g, '');
  triggerDownload(blob, zipName);
}
