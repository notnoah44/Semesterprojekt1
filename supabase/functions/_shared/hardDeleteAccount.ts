import type { createClient } from 'jsr:@supabase/supabase-js@2';

type AdminClient = ReturnType<typeof createClient>;

/**
 * Hard-deletes a user: removes their storage files, then deletes the
 * auth.users row (which cascades to `profiles` and everything referencing it,
 * see `ON DELETE CASCADE` in supabase/schema.sql). Requires a client created
 * with the service-role key.
 */
export async function hardDeleteAccount(admin: AdminClient, userId: string) {
  for (const prefix of [`avatars/${userId}`, `${userId}`]) {
    const { data: files } = await admin.storage.from('avatars').list(prefix);
    if (files?.length) {
      await admin.storage.from('avatars').remove(files.map((f) => `${prefix}/${f.name}`));
    }
  }
  const { data: idFiles } = await admin.storage.from('id-verification').list(userId);
  if (idFiles?.length) {
    await admin.storage.from('id-verification').remove(idFiles.map((f) => `${userId}/${f.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}
