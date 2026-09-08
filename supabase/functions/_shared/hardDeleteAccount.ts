import type { createClient } from 'jsr:@supabase/supabase-js@2';
type AdminClient = ReturnType<typeof createClient>;

/** Collect before removing, so pagination offsets never skip remaining objects. */
async function removeFolder(admin: AdminClient, bucket: string, prefix: string, depth = 0): Promise<void> {
  if (depth > 16) throw new Error('Unexpected storage nesting');
  const paths: string[] = [];
  const folders: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    for (const file of data ?? []) {
      if (!file.name || file.name.includes('/') || ['.', '..'].includes(file.name)) throw new Error('Invalid storage entry');
      (file.id ? paths : folders).push(`${prefix}/${file.name}`);
    }
    if (!data || data.length < 100) break;
  }
  for (const folder of folders) await removeFolder(admin, bucket, folder, depth + 1);
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { error } = await admin.storage.from(bucket).remove(paths.slice(offset, offset + 100));
    if (error) throw error;
  }
}

export async function hardDeleteAccount(admin: AdminClient, userId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) throw new Error('Invalid account ID');
  // Keep auth available for retry, but reject new writes/uploads during cleanup.
  const { error: requestError } = await admin.from('account_deletion_requests').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (requestError) throw requestError;
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw error;
  for (const bucket of ['avatars', 'listing-photos', 'sitter-listing-photos', 'id-verification']) {
    if (!buckets?.some((entry) => entry.id === bucket)) continue;
    await removeFolder(admin, bucket, userId);
    if (bucket === 'avatars') await removeFolder(admin, bucket, `avatars/${userId}`);
  }
  // Migration fixes cascading relations. Keep the RevenueCat UUID purchase
  // record for store restore; the app never sends email/name to RevenueCat.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) throw deleteError;
}
