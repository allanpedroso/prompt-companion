import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileQuestion } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildDocumentFilename } from '@/lib/documentNaming';
import { downloadDocumentFromStorage } from '@/lib/pdfExport';

interface DocumentViewerModalProps {
  doc: {
    id: string;
    file_path?: string | null;
    original_filename: string;
    stored_filename?: string | null;
    type: string;
    extracted: Record<string, any>;
    expense_id?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DocumentViewerModal({ doc, open, onOpenChange }: DocumentViewerModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open || !doc?.file_path) { setUrl(null); return; }
    setLoading(true);
    supabase.storage.from('documents').createSignedUrl(doc.file_path, 300)
      .then(({ data, error }) => {
        setUrl(error || !data ? null : data.signedUrl);
        setLoading(false);
      });
    return () => setUrl(null);
  }, [open, doc?.file_path]);

  const isPdf = doc?.original_filename?.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|webp)$/i.test(doc?.original_filename || '');
  const filename = doc ? buildDocumentFilename(doc as any, []) : '';

  const handleDownload = async () => {
    if (!doc) return;
    setDownloading(true);
    try {
      await downloadDocumentFromStorage(doc);
      toast.success('Download iniciado');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao baixar');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex flex-row items-center justify-between border-b border-border">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-semibold truncate">{filename}</DialogTitle>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{doc?.original_filename}</p>
          </div>

          <Button size="sm" variant="outline" className="gap-1.5 ml-4 shrink-0" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Baixar
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex items-center justify-center bg-muted/30">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Carregando documento...</p>
            </div>
          )}
          {!loading && !url && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <FileQuestion className="w-12 h-12" />
              <p className="text-sm">Arquivo não disponível para visualização</p>
            </div>
          )}
          {!loading && url && isPdf && (
            <iframe src={url} className="w-full h-full border-0" title={filename} />
          )}
          {!loading && url && isImage && (
            <img src={url} alt={filename} className="max-w-full max-h-full object-contain p-4" />
          )}
          {!loading && url && !isPdf && !isImage && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <FileQuestion className="w-12 h-12" />
              <p className="text-sm">Visualização não disponível para este tipo</p>
              <Button size="sm" onClick={handleDownload} disabled={downloading}>
                <Download className="w-4 h-4 mr-1.5" />Baixar arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
