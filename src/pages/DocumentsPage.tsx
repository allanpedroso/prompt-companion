import { motion } from 'framer-motion';
import { useDocuments } from '@/hooks/useDocuments';
import DocumentTypeBadge from '@/components/DocumentTypeBadge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DocumentsPage() {
  const { data: documents = [], isLoading } = useDocuments();
  const needsReview = documents.filter(d => (d.confidence ?? 0) < 70);
  const reviewed = documents.filter(d => (d.confidence ?? 0) >= 70);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-2xl font-bold text-foreground">Revisão de Documentos</h1></div>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Revisão de Documentos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {needsReview.length} documento(s) precisam de revisão manual
        </p>
      </div>

      {needsReview.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Revisão necessária
          </h2>
          {needsReview.map((doc, i) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-warning">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.original_filename}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Confiança: {doc.confidence}%</p>
              </div>
              <DocumentTypeBadge type={doc.type as any} />
              <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity">Revisar</button>
            </motion.div>
          ))}
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
