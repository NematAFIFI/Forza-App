import { supabase } from './supabase';

export async function toggleArchive(table: string, id: string, archived: boolean): Promise<void> {
  await supabase.from(table).update({
    archived: !archived,
    archived_at: !archived ? new Date().toISOString() : null,
  }).eq('id', id);
}
