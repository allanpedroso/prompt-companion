import { motion } from 'framer-motion';
import { FileText, Receipt, AlertTriangle, CheckCircle, Upload, TrendingUp } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useDocuments } from '@/hooks/useDocuments';
import { categoryLabels } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: expenses = [], isLoading: loadingExp } = useExpenses();
  const { data: documents = [], isLoading: loadingDoc } = useDocuments();

  const loading = loadingExp || loadingDoc;

  const stats = [
    { label: 'Documentos', value: documents.length, icon: FileText, color: 'text-info' },
    { label: 'Despesas', value: expenses.length, icon: Receipt, color: 'text-primary' },
    { label: 'Quitadas', value: expenses.filter(e => e.status === 'quitada').length, icon: CheckCircle, color: 'text-success' },
    { label: 'Pendentes', value: expenses.filter(e => e.status === 'pendente').length, icon: AlertTriangle, color: 'text-warning' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral dos seus documentos financeiros</p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Upload className="w-4 h-4" />
          Novo Upload
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            {loading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-bold text-foreground">{stat.value}</p>}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card"
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Despesas Recentes</h2>
          <button onClick={() => navigate('/despesas')} className="text-sm text-primary hover:underline font-medium">
            Ver todas
          </button>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : expenses.length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">Nenhuma despesa ainda. Comece enviando documentos!</div>
          ) : (
            expenses.slice(0, 5).map(expense => (
              <div key={expense.id} className="px-6 py-4 flex items-center gap-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate('/despesas')}>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{expense.estabelecimento}</p>
                  <p className="text-xs text-muted-foreground">{categoryLabels[expense.category as keyof typeof categoryLabels] || expense.category} · {expense.emissao_mes_ano}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground font-mono">
                    R$ {Number(expense.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <StatusBadge status={expense.status as any} />
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
