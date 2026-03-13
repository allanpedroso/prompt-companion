import { motion } from 'framer-motion';
import { useExpensesWithDocuments } from '@/hooks/useExpenses';
import { categoryLabels } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import DocumentTypeBadge from '@/components/DocumentTypeBadge';
import { ChevronRight, FileText, Download, Filter, X, CalendarIcon, Merge, Loader2, Eye, FileDown, Files } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import {
  exportExpenseMergedPDF,
  exportExpenseAsZip,
  exportMultipleExpensesZip,
  exportMultipleExpensesIndividualZip,
} from '@/lib/pdfExport';

const months = [
  { value: 'all', label: 'Todos os meses' },
  { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' }, { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' }, { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
];

// Modal para escolher tipo de exportação PDF
function ExportPDFModal({
  open,
  onOpenChange,
  count,
  onMerged,
  onIndividual,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
  onMerged: () => void;
  onIndividual: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Exportar como PDF</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {count === 1
              ? 'Escolha como deseja exportar os documentos desta despesa.'
              : `Escolha como exportar as ${count} despesas selecionadas.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-1">
          <button
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-muted transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
            onClick={onMerged}
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileDown className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground">PDF único por despesa</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Todos os documentos concatenados em um PDF</p>
            </div>
          </button>
          <button
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-muted transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
            onClick={onIndividual}
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Files className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground">Arquivos individuais (ZIP)</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Cada documento com nome correto em pasta separada</p>
            </div>
          </button>
        </div>
        {loading && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" /> Gerando arquivos...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ExpensesPage() {
  const { data: expenses = [], isLoading } = useExpensesWithDocuments();
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [consolidating, setConsolidating] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<'selected' | 'all'>('selected');
  const [exporting, setExporting] = useState(false);

  const findDuplicateGroups = (list: typeof expenses) => {
    const groups: typeof expenses[] = [];
    const used = new Set<string>();

    for (let i = 0; i < list.length; i++) {
      if (used.has(list[i].id)) continue;
      const group = [list[i]];
      used.add(list[i].id);

      for (let j = i + 1; j < list.length; j++) {
        if (used.has(list[j].id)) continue;
        if (list[j].estabelecimento !== list[i].estabelecimento) continue;

        const samePeriod = list[i].emissao_mes_ano && list[j].emissao_mes_ano &&
          list[i].emissao_mes_ano === list[j].emissao_mes_ano;
        const sameValue = Math.abs(Number(list[i].valor_total) - Number(list[j].valor_total)) < 0.01;
        const oneMissingPeriod = !list[i].emissao_mes_ano || !list[j].emissao_mes_ano;

        if (samePeriod || (sameValue && oneMissingPeriod) || (sameValue && samePeriod !== false)) {
          group.push(list[j]);
          used.add(list[j].id);
        }
      }
      if (group.length > 1) groups.push(group);
    }
    return groups;
  };

  const duplicateGroups = useMemo(() => findDuplicateGroups(expenses), [expenses]);
  const duplicateCount = useMemo(() => duplicateGroups.reduce((sum, g) => sum + g.length - 1, 0), [duplicateGroups]);

  const handleConsolidate = async () => {
    setConsolidating(true);
    try {
      const groups = findDuplicateGroups(expenses);
      let merged = 0;
      for (const group of groups) {
        if (group.length <= 1) continue;
        const sorted = [...group].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const primary = sorted[0];
        const duplicates = sorted.slice(1);

        const allSameValue = sorted.every(e => Math.abs(Number(e.valor_total) - Number(sorted[0].valor_total)) < 0.01);
        const finalValor = allSameValue
          ? Number(primary.valor_total)
          : Math.max(...sorted.map(e => Number(e.valor_total)));

        const nfNumero = sorted.find(e => e.nf_numero)?.nf_numero || primary.nf_numero;
        const emissaoMesAno = sorted.find(e => e.emissao_mes_ano)?.emissao_mes_ano || primary.emissao_mes_ano;

        await supabase.from('expenses').update({ valor_total: finalValor, nf_numero: nfNumero, emissao_mes_ano: emissaoMesAno }).eq('id', primary.id);

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

  const getExportExpenses = () => {
    if (exportTarget === 'all') return filteredExpenses;
    return filteredExpenses.filter(e => selectedIds.has(e.id));
  };

  const handleExportMerged = async () => {
    const toExport = getExportExpenses();
    setExporting(true);
    try {
      if (toExport.length === 1) {
        const exp = toExport[0];
        await exportExpenseMergedPDF(exp as any, (exp.documents || []) as any);
        toast.success('PDF exportado com sucesso');
      } else {
        await exportMultipleExpensesZip(toExport as any);
        toast.success(`${toExport.length} PDFs exportados em ZIP`);
      }
      setExportModalOpen(false);
    } catch (e: any) {
      toast.error(`Erro ao exportar: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportIndividual = async () => {
    const toExport = getExportExpenses();
    setExporting(true);
    try {
      await exportMultipleExpensesIndividualZip(toExport as any);
      toast.success(`Arquivos exportados em ZIP`);
      setExportModalOpen(false);
    } catch (e: any) {
      toast.error(`Erro ao exportar: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const openExportModal = (target: 'selected' | 'all') => {
    setExportTarget(target);
    setExportModalOpen(true);
  };

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-sm text-muted-foreground mt-1">Timeline de despesas e documentos vinculados</p>
        </div>
        {selectedIds.size > 0 && (
          <Button size="sm" className="shrink-0" onClick={() => openExportModal('selected')}>
            <Download className="w-4 h-4 mr-1" /> Exportar {selectedIds.size}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Filter className="w-4 h-4" /><span>Filtros:</span></div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[150px] h-8 text-sm"><CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[100px] h-8 text-sm"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {years.map(y => <SelectItem key={y} value={y!}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setSelectedMonth('all'); setSelectedYear('all'); }}>
            <X className="w-3.5 h-3.5 mr-1" /> Limpar
          </Button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {duplicateCount > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs whitespace-nowrap" onClick={handleConsolidate} disabled={consolidating}>
              {consolidating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Merge className="w-3.5 h-3.5 mr-1" />}
              Duplicatas ({duplicateCount})
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs whitespace-nowrap" onClick={toggleAll}>
            {selectedIds.size === filteredExpenses.length && filteredExpenses.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs whitespace-nowrap" onClick={() => openExportModal('all')}>
            <Download className="w-3.5 h-3.5 mr-1" /> Exportar tudo ({filteredExpenses.length})
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredExpenses.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma despesa encontrada.</div>}
        {filteredExpenses.map((expense, i) => (
          <motion.div key={expense.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors">
            <div className="flex items-center">
              <div className="pl-4 flex items-center shrink-0">
                <Checkbox checked={selectedIds.has(expense.id)} onCheckedChange={() => toggleSelect(expense.id)} />
              </div>
              <button className="flex-1 px-4 py-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left min-w-0"
                onClick={() => setExpandedId(expandedId === expense.id ? null : expense.id)}>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{expense.estabelecimento}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{categoryLabels[expense.category as keyof typeof categoryLabels] || expense.category} · {expense.emissao_mes_ano}{expense.nf_numero && ` · NF ${expense.nf_numero}`}</p>
                </div>
                <div className="text-right flex items-center gap-2 shrink-0">
                  <div>
                    <p className="text-sm font-bold text-foreground font-mono whitespace-nowrap">R$ {Number(expense.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <div className="flex justify-end mt-1">
                      <StatusBadge status={expense.status as any} />
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${expandedId === expense.id ? 'rotate-90' : ''}`} />
                </div>
              </button>
            </div>
            {expandedId === expense.id && expense.documents?.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t border-border px-5 py-4 bg-muted">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">Documentos ({expense.documents.length})</p>
                <div className="space-y-2">
                  {expense.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-3 py-1">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.stored_filename || doc.original_filename}</p>
                        <DocumentTypeBadge type={doc.type as any} />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 hover:bg-primary/10 hover:text-foreground text-muted-foreground"
                        title="Visualizar"
                        onClick={() => setViewingDoc(doc)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      <DocumentViewerModal
        doc={viewingDoc}
        open={!!viewingDoc}
        onOpenChange={(open) => { if (!open) setViewingDoc(null); }}
      />

      <ExportPDFModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        count={exportTarget === 'all' ? filteredExpenses.length : selectedIds.size}
        onMerged={handleExportMerged}
        onIndividual={handleExportIndividual}
        loading={exporting}
      />
    </div>
  );
}
