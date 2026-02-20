import { type ExpenseStatus, statusLabels } from '@/data/mockData';

const statusClasses: Record<ExpenseStatus, string> = {
  pendente: 'badge-pendente',
  em_andamento: 'badge-em-andamento',
  quitada: 'badge-quitada',
  divergente: 'badge-divergente',
};

export default function StatusBadge({ status }: { status: ExpenseStatus }) {
  return (
    <span className={statusClasses[status]}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </span>
  );
}
