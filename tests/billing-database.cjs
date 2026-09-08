const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';

(async () => {
  const db = new PGlite();
  try {
    // Supabase-owned schemas/roles are represented locally; the entire app
    // schema and the actual new migration are executed unchanged below.
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text UNIQUE, raw_user_meta_data jsonb DEFAULT '{}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
      CREATE SCHEMA storage;
      CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean);
      CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(), bucket_id text, name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array(name,'/') $$;
      CREATE PUBLICATION supabase_realtime;
    `);
    await db.exec(fs.readFileSync('supabase/schema.sql', 'utf8'));
    await db.exec(`INSERT INTO auth.users(id,email) VALUES ('${id}','first@example.com'),('${other}','second@example.com');
      UPDATE profiles SET membership_tier='standard',membership_expires_at=now()+interval '1 year';`);
    await db.exec(fs.readFileSync('supabase/migrations/20260908010000_store_memberships.sql', 'utf8'));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM profiles WHERE membership_tier=\'standard\'')).rows[0].n, 0, 'demo grants are reset');
    await db.exec(`GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon,service_role;
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
      REVOKE ALL ON billing_sync_state,account_deletion_requests FROM authenticated;
      GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
      SET request.jwt.claim.sub='${id}'; SET request.jwt.claim.role='authenticated'; SET ROLE authenticated;`);
    await assert.rejects(() => db.exec("UPDATE profiles SET membership_tier='standard',membership_expires_at=now()+interval '1 year'"), /Membership is managed/);
    await assert.rejects(() => db.exec('SELECT next_billing_revision()'), /permission denied/);
    await assert.rejects(() => db.exec(`SELECT apply_membership_snapshot('${id}',999,'{}')`), /permission denied/);
    await db.exec("UPDATE profiles SET bio='Harmless profile edit' WHERE id=auth.uid(); RESET ROLE; SET request.jwt.claim.role='service_role';");
    const active = { membership_tier: 'standard', membership_plan: 'monthly', membership_expires_at: '2099-01-01T00:00:00Z', auto_renew: true, membership_status: 'active' };
    const free = { membership_tier: 'free', membership_plan: null, membership_expires_at: null, auto_renew: false, membership_status: 'refunded' };
    await db.query('SELECT apply_membership_snapshot($1,2,$2)', [id, JSON.stringify(active)]);
    await db.query('SELECT apply_membership_snapshot($1,1,$2)', [id, JSON.stringify(free)]);
    assert.equal((await db.query('SELECT membership_tier FROM profiles WHERE id=$1',[id])).rows[0].membership_tier, 'standard', 'late snapshots cannot roll back new state');
    await db.query('SELECT apply_membership_snapshot($1,3,$2)', [id, JSON.stringify(free)]);
    assert.equal((await db.query('SELECT membership_tier FROM profiles WHERE id=$1',[id])).rows[0].membership_tier, 'free');
    // Active membership must not prevent deletion. Build actual related records.
    await db.query('SELECT apply_membership_snapshot($1,4,$2)', [id, JSON.stringify(active)]);
    await db.exec(`INSERT INTO conversations(id,participant1,participant2) VALUES ('33333333-3333-4333-8333-333333333333','${id}','${other}');
      INSERT INTO messages(conversation_id,sender_id,content) VALUES ('33333333-3333-4333-8333-333333333333','${other}','Test');
      INSERT INTO bookings(id,sitter_id,owner_id,start_date,end_date) VALUES ('44444444-4444-4444-8444-444444444444','${id}','${other}','2026-01-01','2026-01-02');
      INSERT INTO reviews(booking_id,reviewer_id,reviewee_id,rating) VALUES ('44444444-4444-4444-8444-444444444444','${other}','${id}',5);
      INSERT INTO favourites(profile_id,sitter_id) VALUES ('${other}','${id}');
      INSERT INTO app_feedback(profile_id,comment) VALUES ('${id}','Test');
      INSERT INTO account_deletion_requests(user_id) VALUES ('${id}');
      SET request.jwt.claim.role='authenticated'; SET ROLE authenticated;`);
    await assert.rejects(() => db.exec(`INSERT INTO storage.objects(bucket_id,name) VALUES ('avatars','${id}/new.jpg')`), /row-level security/);
    await db.exec(`RESET ROLE; SET request.jwt.claim.role='service_role'; DELETE FROM auth.users WHERE id='${id}';`);
    for (const table of ['messages','conversations','bookings','reviews','favourites','app_feedback','billing_sync_state','account_deletion_requests']) {
      assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, 0, `${table} must not block account deletion`);
    }
    assert.equal((await db.query('SELECT count(*)::int AS n FROM profiles')).rows[0].n, 1, 'other account survives');
    await db.exec(`INSERT INTO auth.users(id,email) VALUES ('55555555-5555-4555-8555-555555555555','first@example.com');`);
    assert.equal((await db.query("SELECT membership_tier FROM profiles WHERE id='55555555-5555-4555-8555-555555555555'")).rows[0].membership_tier, 'free');
    console.log('Passed: actual schema + migration in PostgreSQL/PGlite, protected Pro fields/RPCs, demo reset, snapshot ordering, deletion upload guard, cascading account deletion with active Pro, same-email re-registration.');
  } finally { await db.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
