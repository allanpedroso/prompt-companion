import { motion } from 'framer-motion';
import { useExpensesWithDocuments } from '@/hooks/useExpenses';
import { categoryLabels } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import DocumentTypeBadge from '@/components/DocumentTypeBadge';
import { ChevronRight, FileText, Download, Filter, X, CalendarIcon, Merge, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const months = [
  { value: 'all', label: 'Todos os meses' },
  { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' }, { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' }, { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
];

function exportExpenseToCSV(expenses: any[]) {
  const header = 'Estabelecimento,CNPJ/CPF,Categoria,Status,NF,Valor,Mês/Ano\n';
  const rows = expenses.map(e =>
    `"${e.estabelecimento}","${e.cnpj_cpf || ''}","${categoryLabels[e.category as keyof typeof categoryLabels] || e.category}","${e.status}","${e.nf_numero || ''}","${Number(e.valor_total).toFixed(2)}","${e.emissao_mes_ano || ''}"`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `despesas_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success(`${expenses.length} despesa(s) exportada(s)`);
}

export default function ExpensesPage() {
  const { data: expenses = [], isLoading } = useExpensesWithDocuments();
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [consolidating, setConsolidating] = useState(false);

  const duplicateCount = useMemo(() => {
    const groups = new Map<string, number>();
    expenses.forEach(e => {
      const key = `${e.estabelecimento}||${e.emissao_mes_ano || ''}`;
      groups.set(key, (groups.get(key) || 0) + 1);
    });
    return Array.from(groups.values()).filter(c => c > 1).reduce((sum, c) => sum + c - 1, 0);
  }, [expenses]);

  const handleConsolidate = async () => {
    setConsolidating(true);
    try {
      const groups = new Map<string, typeof expenses>();
      expenses.forEach(e => {
        const key = `${e.estabelecimento}||${e.emissao_mes_ano || ''}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(e);
      });

      let merged = 0;
      for (const [, group] of groups) {
        if (group.length <= 1) continue;
        const sorted = [...group].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const primary = sorted[0];
        const duplicates = sorted.slice(1);

        // Smart merge: if all values are the same, it's the same transaction (boleto+NF etc)
        // If different, keep the max value
        const allSameValue = sorted.every(e => Math.abs(Number(e.valor_total) - Number(sorted[0].valor_total)) < 0.01);
        const finalValor = allSameValue
          ? Number(primary.valor_total)
          : Math.max(...sorted.map(e => Number(e.valor_total)));

        // Merge NF numbers
        const nfNumero = sorted.find(e => e.nf_numero)?.nf_numero || primary.nf_numero;

        await supabase.from('expenses').update({ valor_total: finalValor, nf_numero: nfNumero }).eq('id', primary.id);

        for (const dup of duplicates) {
          if (dup.documents?.length) {
            for (const doc of dup.documents) {
              await supabase.from('documents').update({ expense_id: primary.id }).eq('id', doc.id);
            }
          }
          await supabase.from('expenses').delete().eq('id', dup.id);
          merged++;
        }
      }

      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenses-with-docs'] });
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`${merged} despesa(s) duplicada(s) consolidada(s)`);
    } catch (e: any) {
      toast.error(`Erro ao consolidar: ${e.message}`);
    } finally {
      setConsolidating(false);
    }
  };

  const years = useMemo(() => Array.from(new Set(expenses.map(e => e.emissao_mes_ano?.split('-')[1]).filter(Boolean))).sort().reverse(), [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!e.emissao_mes_ano) return true;
      const [mes, ano] = e.emissao_mes_ano.split('-');
      if (selectedMonth !== 'all' && mes !== selectedMonth) return false;
      if (selectedYear !== 'all' && ano !== selectedYear) return false;
      return true;
    });
  }, [expenses, selectedMonth, selectedYear]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelectedIds(selectedIds.size === filteredExpenses.length ? new Set() : new Set(filteredExpenses.map(e => e.id)));
  };

  const hasFilters = selectedMonth !== 'all' || selectedYear !== 'all';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-foreground">Despesas</h1></div>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-sm text-muted-foreground mt-1">Timeline de despesas e documentos vinculados</p>
        </div>
        {selectedIds.size > 0 && (
          <Button size="sm" onClick={() => exportExpenseToCSV(filteredExpenses.filter(e => selectedIds.has(e.id)))}>
            <Download className="w-4 h-4 mr-1" /> Exportar {selectedIds.size}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Filter className="w-4 h-4" /><span>Filtros:</span></div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[160px] h-9 text-sm"><CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {years.map(y => <SelectItem key={y} value={y!}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setSelectedMonth('all'); setSelectedYear('all'); }}><X className="w-3.5 h-3.5 mr-1" /> Limpar</Button>}
        <div className="ml-auto flex items-center gap-2">
          {duplicateCount > 0 && (
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleConsolidate} disabled={consolidating}>
              {consolidating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Merge className="w-3.5 h-3.5 mr-1" />}
              Consolidar duplicatas ({duplicateCount})
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={toggleAll}>
            {selectedIds.size === filteredExpenses.length && filteredExpenses.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => exportExpenseToCSV(filteredExpenses)}>
            <Download className="w-3.5 h-3.5 mr-1" /> Exportar tudo ({filteredExpenses.length})
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredExpenses.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma despesa encontrada.</div>}
        {filteredExpenses.map((expense, i) => (
          <motion.div key={expense.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card overflow-hidden">
            <div className="flex items-center">
              <div className="pl-4 flex items-center">
                <Checkbox checked={selectedIds.has(expense.id)} onCheckedChange={() => toggleSelect(expense.id)} />
              </div>
              <button className="flex-1 px-4 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
                onClick={() => setExpandedId(expandedId === expense.id ? null : expense.id)}>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{expense.estabelecimento}</p>
                  <p className="text-xs text-muted-foreground">{categoryLabels[expense.category as keyof typeof categoryLabels] || expense.category} · {expense.emissao_mes_ano}{expense.nf_numero && ` · NF ${expense.nf_numero}`}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground font-mono">R$ {Number(expense.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <StatusBadge status={expense.status as any} />
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedId === expense.id ? 'rotate-90' : ''}`} />
                </div>
              </button>
            </div>
            {expandedId === expense.id && expense.documents?.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t border-border px-6 py-4 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Documentos ({expense.documents.length})</p>
                <div className="space-y-3">
                  {expense.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-start gap-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{doc.stored_filename || doc.original_filename}</p>
                        <DocumentTypeBadge type={doc.type as any} />
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
