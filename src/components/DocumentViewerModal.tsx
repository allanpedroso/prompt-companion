import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileQuestion, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildDocumentFilename } from '@/lib/documentNaming';

interface DocumentViewerModalProps {
  doc: {
    id: string;
    file_path?: string | null;
    original_filename: string;
    stored_filename?: string | null;
    type: string;
    extracted: Record<string, unknown>;
    expense_id?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function DocumentViewerModal({ doc, open, onOpenChange }: DocumentViewerModalProps) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<any>(null);
  const baseScaleRef = useRef(1);

  const isPdf = doc?.original_filename?.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|webp)$/i.test(doc?.original_filename || '');
  const filename = doc ? buildDocumentFilename(doc as any, []) : '';

  // Download blob from Supabase
  useEffect(() => {
    if (!open || !doc?.file_path) { setBlob(null); return; }
    setLoading(true);
    setPageNum(1);
    setTotalPages(0);
    pdfRef.current = null;
    supabase.storage.from('documents').download(doc.file_path).then(({ data, error }) => {
      if (error || !data) { setBlob(null); }
      else { setBlob(data); }
      setLoading(false);
    });
    return () => { setBlob(null); };
  }, [open, doc?.file_path]);

  // Load PDF with pdf.js when blob is ready
  useEffect(() => {
    if (!blob || !isPdf) return;
    let cancelled = false;
    loadPdfJs().then(async (pdfjsLib) => {
      const arrayBuffer = await blob.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      if (cancelled) return;
      pdfRef.current = pdf;
      setTotalPages(pdf.numPages);
      setPageNum(1);
    }).catch(() => toast.error('Erro ao carregar PDF'));
    return () => { cancelled = true; };
  }, [blob, isPdf]);

  // Render current page to canvas
  useEffect(() => {
    if (!pdfRef.current || !canvasRef.current || !isPdf) return;
    let cancelled = false;
    setRendering(true);
    pdfRef.current.getPage(pageNum).then((page: any) => {
      if (cancelled) return;
      const canvas = canvasRef.current!;
      const container = canvas.parentElement!;
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(
        (container.clientWidth - 32) / viewport.width,
        (container.clientHeight - 32) / viewport.height,
        2
      );
      const scaled = page.getViewport({ scale });
      canvas.width = scaled.width;
      canvas.height = scaled.height;
      const ctx = canvas.getContext('2d')!;
      page.render({ canvasContext: ctx, viewport: scaled }).promise.then(() => {
        if (!cancelled) setRendering(false);
      });
    });
    return () => { cancelled = true; };
  }, [pageNum, totalPages, isPdf]);

  const handleDownload = async () => {
    if (!blob) return;
    setDownloading(true);
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download iniciado');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao baixar');
    } finally {
      setDownloading(false);
    }
  };

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob || !isImage) { setImageUrl(null); return; }
    const url = URL.createObjectURL(blob);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob, isImage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 gap-0 [&>button.absolute]:right-2 [&>button.absolute]:top-2 [&>button.absolute]:z-50">
        <DialogHeader className="px-6 py-4 border-b border-border flex-row items-center justify-between space-y-0 shrink-0">
          <div className="min-w-0 flex-1 pr-10">
            <DialogTitle className="text-sm font-semibold truncate">{filename}</DialogTitle>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{doc?.original_filename}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isPdf && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setPageNum(p => Math.max(1, p - 1))}
                  disabled={pageNum <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-16 text-center">
                  {pageNum} / {totalPages}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setPageNum(p => Math.min(totalPages, p + 1))}
                  disabled={pageNum >= totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={downloading || !blob}
              className="shrink-0"
            >
              {downloading
                ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                : <Download className="w-4 h-4 mr-1.5" />}
              Baixar
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center relative">
          {(loading || rendering) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/30 z-10">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">
                {loading ? 'Carregando documento...' : 'Renderizando página...'}
              </p>
            </div>
          )}

          {!loading && !blob && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <FileQuestion className="w-12 h-12" />
              <p className="text-sm">Arquivo não disponível para visualização</p>
              <p className="text-xs opacity-60">
                {!doc?.file_path
                  ? 'Sem caminho de arquivo registrado'
                  : 'Erro ao carregar o arquivo'}
              </p>
            </div>
          )}

          {!loading && blob && isPdf && (
            <div className="flex items-center justify-center p-4 min-h-full w-full">
              <canvas
                ref={canvasRef}
                className="shadow-lg rounded"
                style={{ maxWidth: '100%' }}
              />
            </div>
          )}

          {!loading && blob && isImage && imageUrl && (
            <img
              src={imageUrl}
              alt={filename}
              className="max-w-full max-h-full object-contain p-4"
            />
          )}

          {!loading && blob && !isPdf && !isImage && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <FileQuestion className="w-12 h-12" />
              <p className="text-sm">Visualização não disponível para este tipo de arquivo</p>
              <Button size="sm" onClick={handleDownload} disabled={downloading}>
                <Download className="w-4 h-4 mr-1.5" />
                Baixar arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
