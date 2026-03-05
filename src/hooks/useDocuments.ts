import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export function useDocuments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['documents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DocumentRow[];
    },
    enabled: !!user,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File): Promise<{ id: string; filePath: string }> => {
      const userId = user!.id;
      const filePath = `${userId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: insertData, error: insertError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          original_filename: file.name,
          stored_filename: file.name,
          file_path: filePath,
          type: 'unknown',
          confidence: 0,
          extracted: {},
        })
        .select('id')
        .single();
      if (insertError) throw insertError;

      supabase.functions.invoke('process-document', {
        body: { document_id: insertData.id },
      }).then(({ error }) => {
        if (error) console.error('AI processing error:', error);
        qc.invalidateQueries({ queryKey: ['documents'] });
        qc.invalidateQueries({ queryKey: ['expenses-with-docs'] });
      });

      return { id: insertData.id, filePath };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['expenses-with-docs'] });
    },
  });
}

export function useReprocessDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: { document_id: documentId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['expenses-with-docs'] });
    },
  });
}
