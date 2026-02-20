import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter } from 'lucide-react';
import { mockDocuments, mockExpenses, typeLabels, categoryLabels, type DocumentType, type Category } from '@/data/mockData';
import DocumentTypeBadge from '@/components/DocumentTypeBadge';
import StatusBadge from '@/components/StatusBadge';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('');

  const filteredDocs = useMemo(() => {
    return mockDocuments.filter(doc => {
      const matchQuery = !query || 
        doc.stored_filename.toLowerCase().includes(query.toLowerCase()) ||
        doc.extracted.estabelecimento?.toLowerCase().includes(query.toLowerCase());
      const matchType = !typeFilter || doc.type === typeFilter;
      return matchQuery && matchType;
    });
  }, [query, typeFilter]);

  const filteredExpenses = useMemo(() => {
    return mockExpenses.filter(exp => {
      const matchQuery = !query ||
        exp.estabelecimento.toLowerCase().includes(query.toLowerCase()) ||
        exp.cnpj_cpf.includes(query);
      const matchCategory = !categoryFilter || exp.category === categoryFilter;
      return matchQuery && matchCategory;
    });
  }, [query, categoryFilter]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Busca e Filtros</h1>
        <p className="text-sm text-muted-foreground mt-1">Encontre documentos e despesas rapidamente</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por estabelecimento, nome do arquivo..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as DocumentType | '')}
          className="px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as Category | '')}
          className="px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">Todas as categorias</option>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Documents */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            Documentos ({filteredDocs.length})
          </h2>
          {filteredDocs.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.stored_filename}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {doc.extracted.estabelecimento}
                    {doc.extracted.valor && ` · R$ ${doc.extracted.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
                <DocumentTypeBadge type={doc.type} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Expenses */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            Despesas ({filteredExpenses.length})
          </h2>
          {filteredExpenses.map((exp, i) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{exp.estabelecimento}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {categoryLabels[exp.category]} · {exp.emissao_mes_ano}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono text-foreground">
                    R$ {exp.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <StatusBadge status={exp.status} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
