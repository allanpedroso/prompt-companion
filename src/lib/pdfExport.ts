import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import type { Document, Expense } from '@/data/mockData';
import {
  buildDocumentFilename,
  buildMergeFilename,
  formatDateBR,
  formatMoneyBR,
} from './documentNaming';

function triggerDownloadPdf(data: Uint8Array, filename: string) {
  const blob = new Blob([data as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function triggerDownloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '');
}

// Download single document from Supabase Storage with correct naming
export async function downloadDocumentFromStorage(doc: any): Promise<void> {
  const { supabase } = await import('@/integrations/supabase/client');
  const filePath = doc.file_path;
  if (!filePath) throw new Error('file_path não disponível');

  const { data, error } = await supabase.storage.from('documents').download(filePath);
  if (error || !data) throw new Error(error?.message || 'Falha ao baixar arquivo');

  const filename = buildDocumentFilename(doc, []);
  triggerDownloadBlob(data, filename);
}

// Embed a real document blob (PDF or image) into a PDFDocument
async function embedDocBlob(blob: Blob, pdfDoc: PDFDocument): Promise<void> {
  const arrayBuffer = await blob.arrayBuffer();
  const type = blob.type;

  if (type === 'application/pdf') {
    try {
      const srcPdf = await PDFDocument.load(arrayBuffer);
      const pages = await pdfDoc.copyPages(srcPdf, srcPdf.getPageIndices());
      pages.forEach(p => pdfDoc.addPage(p));
      return;
    } catch {
      // fall through to placeholder
    }
  }

  if (type.startsWith('image/')) {
    try {
      let embeddedImage;
      if (type === 'image/png') {
        embeddedImage = await pdfDoc.embedPng(arrayBuffer);
      } else {
        embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
      }
      const page = pdfDoc.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();
      const margin = 40;
      const maxW = width - margin * 2;
      const maxH = height - margin * 2;
      const scale = Math.min(maxW / embeddedImage.width, maxH / embeddedImage.height, 1);
      const imgW = embeddedImage.width * scale;
      const imgH = embeddedImage.height * scale;
      page.drawImage(embeddedImage, {
        x: (width - imgW) / 2,
        y: (height - imgH) / 2,
        width: imgW,
        height: imgH,
      });
      return;
    } catch {
      // fall through to placeholder
    }
  }

  await addPlaceholderPage(pdfDoc);
}

async function addPlaceholderPage(pdfDoc: PDFDocument) {
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText('Documento nao disponivel para visualizacao.', {
    x: 80, y: 400, size: 12, font, color: rgb(0.5, 0.5, 0.5),
  });
}

// Fetch blob from Supabase Storage for a document
async function fetchDocBlob(doc: any): Promise<Blob | null> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const filePath = doc.file_path;
    if (!filePath) return null;
    const { data, error } = await supabase.storage.from('documents').download(filePath);
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

// Export a single expense as one merged PDF (all docs concatenated)
export async function exportExpenseMergedPDF(expense: Expense, docs: Document[]): Promise<void> {
  const order = ['boleto', 'comprovante', 'nf', 'danfe', 'recibo', 'unknown'];
  const sorted = [...docs].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  const pdfDoc = await PDFDocument.create();

  for (const doc of sorted) {
    const blob = await fetchDocBlob(doc);
    if (blob) {
      await embedDocBlob(blob, pdfDoc);
    } else {
      await addPlaceholderPage(pdfDoc);
    }
  }

  const bytes = await pdfDoc.save();
  const filename = buildMergeFilename(expense, sorted);
  triggerDownloadPdf(bytes, filename);
}

// Export a single expense as ZIP with individual PDFs (each with correct name)
export async function exportExpenseAsZip(expense: Expense, docs: Document[]): Promise<void> {
  const zip = new JSZip();

  for (const doc of docs) {
    const blob = await fetchDocBlob(doc);
    const filename = buildDocumentFilename(doc, docs);

    if (blob) {
      if (blob.type === 'application/pdf') {
        zip.file(filename, await blob.arrayBuffer());
      } else if (blob.type.startsWith('image/')) {
        const pdfDoc = await PDFDocument.create();
        await embedDocBlob(blob, pdfDoc);
        const bytes = await pdfDoc.save();
        zip.file(filename, bytes);
      } else {
        zip.file(filename, await blob.arrayBuffer());
      }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const zipName = `${expense.estabelecimento}_${expense.emissao_mes_ano || 'docs'}.zip`
    .replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_');
  triggerDownloadBlob(blob, zipName);
}

// Export multiple expenses: one merged PDF per expense, all zipped together
export async function exportMultipleExpensesZip(expenses: Array<Expense & { documents?: Document[] }>): Promise<void> {
  const zip = new JSZip();

  for (const expense of expenses) {
    const docs = expense.documents || [];
    if (!docs.length) continue;

    const order = ['boleto', 'comprovante', 'nf', 'danfe', 'recibo', 'unknown'];
    const sorted = [...docs].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

    const pdfDoc = await PDFDocument.create();
    for (const doc of sorted) {
      const blob = await fetchDocBlob(doc);
      if (blob) {
        await embedDocBlob(blob, pdfDoc);
      } else {
        await addPlaceholderPage(pdfDoc);
      }
    }

    const bytes = await pdfDoc.save();
    const filename = buildMergeFilename(expense, sorted);
    zip.file(filename, bytes);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const zipName = `despesas_${new Date().toISOString().slice(0, 10)}.zip`;
  triggerDownloadBlob(blob, zipName);
}

// Export multiple expenses as ZIP of folders with individual files per doc
export async function exportMultipleExpensesIndividualZip(expenses: Array<Expense & { documents?: Document[] }>): Promise<void> {
  const zip = new JSZip();

  for (const expense of expenses) {
    const docs = expense.documents || [];
    if (!docs.length) continue;

    const folderName = `${expense.estabelecimento}_${expense.emissao_mes_ano || 'sem-data'}`
      .replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_');
    const folder = zip.folder(folderName)!;

    for (const doc of docs) {
      const blob = await fetchDocBlob(doc);
      const filename = buildDocumentFilename(doc, docs);

      if (blob) {
        if (blob.type === 'application/pdf') {
          folder.file(filename, await blob.arrayBuffer());
        } else if (blob.type.startsWith('image/')) {
          const pdfDoc = await PDFDocument.create();
          await embedDocBlob(blob, pdfDoc);
          const bytes = await pdfDoc.save();
          folder.file(filename, bytes);
        } else {
          folder.file(filename, await blob.arrayBuffer());
        }
      }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const zipName = `despesas_individuais_${new Date().toISOString().slice(0, 10)}.zip`;
  triggerDownloadBlob(blob, zipName);
}

// Legacy functions kept for compatibility
export async function exportSingleDocumentPDF(doc: Document, siblingDocs: Document[] = []) {
  await downloadDocumentFromStorage(doc);
}

export async function exportMergedPDF(expense: Expense, docs: Document[]) {
  await exportExpenseMergedPDF(expense, docs);
}

export async function exportDocumentsAsZip(expense: Expense, docs: Document[]) {
  await exportExpenseAsZip(expense, docs);
}
