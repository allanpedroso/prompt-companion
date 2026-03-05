import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Expense {
  id: string;
  user_id: string;
  estabelecimento: string;
  cnpj_cpf: string | null;
  category: string;
  status: string;
  nf_numero: string | null;
  valor_total: number;
  emissao_mes_ano: string | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  expense_id: string | null;
  original_filename: string;
  stored_filename: string | null;
  file_path: string | null;
  type: string;
  confidence: number | null;
  extracted: Record<string, unknown>;
  created_at: string;
}

export function useExpenses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['expenses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!user,
  });
}

export function useExpensesWithDocuments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['expenses-with-docs', user?.id],
    queryFn: async () => {
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });
      if (expError) throw expError;

      const { data: docs, error: docError } = await supabase
        .from('documents')
        .select('*');
      if (docError) throw docError;

      return (expenses as Expense[]).map(exp => ({
        ...exp,
        documents: (docs as DocumentRow[]).filter(d => d.expense_id === exp.id),
      }));
    },
    enabled: !!user,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: Omit<Expense, 'id' | 'user_id' | 'created_at'>) => {
      const { error } = await supabase.from('expenses').insert({ ...data, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenses-with-docs'] });
    },
  });
}
