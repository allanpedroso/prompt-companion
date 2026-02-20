import { type DocumentType, typeLabels } from '@/data/mockData';
import { FileText, CreditCard, Receipt, FileCheck, FileQuestion } from 'lucide-react';

const icons: Record<DocumentType, React.ElementType> = {
  boleto: CreditCard,
  comprovante: FileCheck,
  nf: FileText,
  danfe: FileText,
  recibo: Receipt,
  unknown: FileQuestion,
};

export default function DocumentTypeBadge({ type }: { type: DocumentType }) {
  const Icon = icons[type];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
      <Icon className="w-3.5 h-3.5" />
      {typeLabels[type]}
    </span>
  );
}
