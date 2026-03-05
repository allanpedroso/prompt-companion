import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDocuments, useReprocessDocument } from '@/hooks/useDocuments';
import DocumentTypeBadge from '@/components/DocumentTypeBadge';
import { AlertTriangle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DocumentsPage() {
  const { data: documents = [], isLoading } = useDocuments();
  const reprocess = useReprocessDocument();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [processingAll, setProcessingAll] = useState(false);

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
        {unprocessedCount > 0 && (
          <Button onClick={handleReprocessAll} disabled={processingAll} variant="outline" size="sm" className="gap-2">
            {processingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Reprocessar todos ({unprocessedCount})
          </Button>
        )}
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
                <Button size="sm" variant="outline" onClick={() => handleReprocess(doc.id)} disabled={isProcessing} className="gap-1.5">
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {isProcessing ? 'Processando...' : 'Reprocessar'}
                </Button>
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
          </motion.div>
        ))}
      </div>
    </div>
  );
}
