import { motion } from 'framer-motion';
import { mockExpenses, categoryLabels, type Expense } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import DocumentTypeBadge from '@/components/DocumentTypeBadge';
import { ChevronRight, FileText, Download, Filter, X, CalendarIcon } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const months = [
  { value: 'all', label: 'Todos os meses' },
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const years = Array.from(new Set(mockExpenses.map(e => e.emissao_mes_ano.split('-')[1]))).sort().reverse();

function exportExpenseToCSV(expenses: Expense[]) {
  const header = 'Estabelecimento,CNPJ/CPF,Categoria,Status,NF,Valor,Mês/Ano\n';
  const rows = expenses.map(e =>
    `"${e.estabelecimento}","${e.cnpj_cpf}","${categoryLabels[e.category]}","${e.status}","${e.nf_numero || ''}","${e.valor_total.toFixed(2)}","${e.emissao_mes_ano}"`
  ).join('\n');
  const csv = header + rows;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `despesas_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${expenses.length} despesa(s) exportada(s) com sucesso`);
}

export default function ExpensesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredExpenses = useMemo(() => {
    return mockExpenses.filter(e => {
      const [mes, ano] = e.emissao_mes_ano.split('-');
      if (selectedMonth !== 'all' && mes !== selectedMonth) return false;
      if (selectedYear !== 'all' && ano !== selectedYear) return false;
      return true;
    });
  }, [selectedMonth, selectedYear]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredExpenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredExpenses.map(e => e.id)));
    }
  };

  const hasFilters = selectedMonth !== 'all' || selectedYear !== 'all';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-sm text-muted-foreground mt-1">Timeline de despesas e documentos vinculados</p>
        </div>
        {selectedIds.size > 0 && (
          <Button size="sm" onClick={() => exportExpenseToCSV(filteredExpenses.filter(e => selectedIds.has(e.id)))}>
            <Download className="w-4 h-4 mr-1" />
            Exportar {selectedIds.size} selecionada(s)
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>Filtros:</span>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px] h-9 text-sm">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {years.map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setSelectedMonth('all'); setSelectedYear('all'); }}>
            <X className="w-3.5 h-3.5 mr-1" /> Limpar
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={toggleAll}>
            {selectedIds.size === filteredExpenses.length && filteredExpenses.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => exportExpenseToCSV(filteredExpenses)}>
            <Download className="w-3.5 h-3.5 mr-1" /> Exportar tudo ({filteredExpenses.length})
          </Button>
        </div>
      </div>

      {/* Expense list */}
      <div className="space-y-4">
        {filteredExpenses.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma despesa encontrada para o período selecionado.</div>
        )}
        {filteredExpenses.map((expense, i) => (
          <motion.div
            key={expense.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card overflow-hidden"
          >
            <div className="flex items-center">
              {/* Checkbox */}
              <div className="pl-4 flex items-center">
                <Checkbox
                  checked={selectedIds.has(expense.id)}
                  onCheckedChange={() => toggleSelect(expense.id)}
                  aria-label={`Selecionar ${expense.estabelecimento}`}
                />
              </div>

              {/* Expense header */}
              <button
                className="flex-1 px-4 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
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

              {/* Individual export */}
              <div className="pr-4">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportExpenseToCSV([expense])} title="Exportar individual">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

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
