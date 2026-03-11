import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileQuestion } from 'lucide-react';
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
    extracted: Record<string, any>;
    expense_id?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DocumentViewerModal({ doc, open, onOpenChange }: DocumentViewerModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open || !doc?.file_path) {
      setBlobUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    setLoading(true);

    supabase.storage
      .from('documents')
      .download(doc.file_path)
      .then(({ data, error }) => {
        if (error || !data) {
          setBlobUrl(null);
        } else {
          objectUrl = URL.createObjectURL(data);
          setBlobUrl(objectUrl);
        }
        setLoading(false);
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setBlobUrl(null);
    };
  }, [open, doc?.file_path]);

  const isPdf = doc?.original_filename?.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|webp)$/i.test(doc?.original_filename || '');
  const filename = doc ? buildDocumentFilename(doc as any, []) : '';

  const handleDownload = async () => {
    if (!doc?.file_path || !blobUrl) return;
    setDownloading(true);
    try {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
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
            {downloading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
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

          {!loading && !blobUrl && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <FileQuestion className="w-12 h-12" />
              <p className="text-sm">Arquivo não disponível para visualização</p>
              <p className="text-xs">
                {!doc?.file_path ? 'Sem caminho de arquivo registrado' : 'Erro ao carregar o arquivo'}
              </p>
            </div>
          )}

          {!loading && blobUrl && isPdf && (
            <iframe src={blobUrl} className="w-full h-full border-0" title={filename} />
          )}

          {!loading && blobUrl && isImage && (
            <img src={blobUrl} alt={filename} className="max-w-full max-h-full object-contain p-4" />
          )}

          {!loading && blobUrl && !isPdf && !isImage && (
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
