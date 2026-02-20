import { motion } from 'framer-motion';
import { mockExpenses, categoryLabels, typeLabels } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import DocumentTypeBadge from '@/components/DocumentTypeBadge';
import { ChevronRight, FileText } from 'lucide-react';
import { useState } from 'react';

export default function ExpensesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
        <p className="text-sm text-muted-foreground mt-1">Timeline de despesas e documentos vinculados</p>
      </div>

      <div className="space-y-4">
        {mockExpenses.map((expense, i) => (
          <motion.div
            key={expense.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card overflow-hidden"
          >
            {/* Expense header */}
            <button
              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
              onClick={() => setExpandedId(expandedId === expense.id ? null : expense.id)}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{expense.estabelecimento}</p>
                <p className="text-xs text-muted-foreground">
                  {categoryLabels[expense.category]} · {expense.emissao_mes_ano}
                  {expense.nf_numero && ` · NF ${expense.nf_numero}`}
                </p>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <p className="text-sm font-bold text-foreground font-mono">
                    R$ {expense.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <StatusBadge status={expense.status} />
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedId === expense.id ? 'rotate-90' : ''}`} />
              </div>
            </button>

            {/* Documents timeline */}
            {expandedId === expense.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-border px-6 py-4 bg-muted/20"
              >
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  Documentos vinculados ({expense.documents.length})
                </p>
                <div className="space-y-3 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {expense.documents.map(doc => (
                    <div key={doc.id} className="flex items-start gap-4 pl-1">
                      <div className="w-[38px] flex justify-center relative z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{doc.stored_filename}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <DocumentTypeBadge type={doc.type} />
                          <span className="text-xs text-muted-foreground">
                            {doc.extracted.valor && `R$ ${doc.extracted.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
