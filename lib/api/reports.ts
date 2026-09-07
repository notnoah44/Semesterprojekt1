import { supabase } from '@/lib/supabase';

export async function createReport(reportedUserId: string, reason: string, description: string, conversationId?: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error('Sign in required');
  const { error } = await supabase.from('reports').insert({ reporter_id: user.id, reported_user_id: reportedUserId, reason, description: description.trim() || null, conversation_id: conversationId ?? null });
  if (error) throw error;
}
