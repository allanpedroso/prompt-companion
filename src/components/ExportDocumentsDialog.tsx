import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import DocumentTypeBadge from '@/components/DocumentTypeBadge';
import { FileDown, FileArchive, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { Expense, Document } from '@/data/mockData';
import { buildDocumentFilename, buildMergeFilename, formatMoneyBR } from '@/lib/documentNaming';
import { exportSingleDocumentPDF, exportMergedPDF, exportDocumentsAsZip } from '@/lib/pdfExport';

interface ExportDocumentsDialogProps {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExportDocumentsDialog({ expense, open, onOpenChange }: ExportDocumentsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const docs = expense.documents;
  const activeDocs = selectedIds.size > 0
    ? docs.filter(d => selectedIds.has(d.id))
    : docs;

  const toggleDoc = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleMerge = async () => {
    setLoading(true);
    try {
      await exportMergedPDF(expense, activeDocs);
      toast.success(`PDF consolidado exportado (${activeDocs.length} docs)`);
    } catch (e) {
      toast.error('Erro ao gerar PDF consolidado');
    } finally {
      setLoading(false);
    }
  };

  const handleZip = async () => {
    setLoading(true);
    try {
      await exportDocumentsAsZip(expense, activeDocs);
      toast.success(`ZIP exportado (${activeDocs.length} docs)`);
    } catch (e) {
      toast.error('Erro ao gerar ZIP');
    } finally {
      setLoading(false);
    }
  };

  const handleSingle = async (doc: Document) => {
    try {
      await exportSingleDocumentPDF(doc, docs);
      toast.success('Documento exportado');
    } catch (e) {
      toast.error('Erro ao exportar documento');
    }
  };

  const mergeFilename = buildMergeFilename(expense, activeDocs);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar documentos</DialogTitle>
          <DialogDescription>
            {expense.estabelecimento} · {expense.emissao_mes_ano}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {docs.map(doc => {
            const filename = buildDocumentFilename(doc, docs);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <Checkbox
                  checked={selectedIds.has(doc.id)}
                  onCheckedChange={() => toggleDoc(doc.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <DocumentTypeBadge type={doc.type} />
                    {doc.extracted.valor !== undefined && (
                      <span className="text-xs font-mono text-muted-foreground">
                        R$ {formatMoneyBR(doc.extracted.valor)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate" title={filename}>
                    → {filename}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleSingle(doc)}
                  title="Exportar individual"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>

        {selectedIds.size > 0 && (
          <p className="text-xs text-muted-foreground">
            {selectedIds.size} de {docs.length} selecionado(s)
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground truncate" title={mergeFilename}>
            Arquivo: <span className="font-mono">{mergeFilename}</span>
          </p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleMerge} disabled={loading}>
              <FileDown className="w-4 h-4 mr-1.5" />
              PDF consolidado
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleZip} disabled={loading}>
              <FileArchive className="w-4 h-4 mr-1.5" />
              ZIP individual
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
