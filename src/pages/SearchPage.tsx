import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { useExpenses } from '@/hooks/useExpenses';
import { typeLabels, categoryLabels } from '@/data/mockData';
import DocumentTypeBadge from '@/components/DocumentTypeBadge';
import StatusBadge from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';

export default function SearchPage() {
  const { data: documents = [], isLoading: loadingDocs } = useDocuments();
  const { data: expenses = [], isLoading: loadingExp } = useExpenses();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchQuery = !query ||
        doc.original_filename?.toLowerCase().includes(query.toLowerCase()) ||
        (doc.extracted as any)?.estabelecimento?.toLowerCase().includes(query.toLowerCase());
      const matchType = !typeFilter || doc.type === typeFilter;
      return matchQuery && matchType;
    });
  }, [documents, query, typeFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchQuery = !query ||
        exp.estabelecimento.toLowerCase().includes(query.toLowerCase()) ||
        exp.cnpj_cpf?.includes(query);
      const matchCategory = !categoryFilter || exp.category === categoryFilter;
      return matchQuery && matchCategory;
    });
  }, [expenses, query, categoryFilter]);

  const loading = loadingDocs || loadingExp;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Busca e Filtros</h1>
        <p className="text-sm text-muted-foreground mt-1">Encontre documentos e despesas rapidamente</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar por estabelecimento, nome do arquivo..." value={query} onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20">
          <option value="">Todos os tipos</option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20">
          <option value="">Todas as categorias</option>
          {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Filter className="w-4 h-4 text-muted-foreground" />Documentos ({filteredDocs.length})</h2>
            {filteredDocs.map((doc, i) => (
              <motion.div key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.stored_filename || doc.original_filename}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(doc.extracted as any)?.estabelecimento}
                      {(doc.extracted as any)?.valor && ` · R$ ${Number((doc.extracted as any).valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </p>
                  </div>
                  <DocumentTypeBadge type={doc.type as any} />
                </div>
              </motion.div>
            ))}
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Filter className="w-4 h-4 text-muted-foreground" />Despesas ({filteredExpenses.length})</h2>
            {filteredExpenses.map((exp, i) => (
              <motion.div key={exp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{exp.estabelecimento}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{categoryLabels[exp.category as keyof typeof categoryLabels] || exp.category} · {exp.emissao_mes_ano}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold font-mono text-foreground">R$ {Number(exp.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <StatusBadge status={exp.status as any} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
