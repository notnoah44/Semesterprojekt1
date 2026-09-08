const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, overrides = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => Object.hasOwn(overrides, name) ? overrides[name] : require(name), module, module.exports);
  return module.exports;
}
const { membershipFromSubscriber: parse, webhookUserIds } = load('supabase/functions/_shared/membership.ts');
const now = Date.parse('2026-09-08T12:00:00Z');
const future = '2026-10-08T12:00:00Z';
const past = '2026-09-07T12:00:00Z';
const products = { monthly: 'monthly' };
function payload(changes = {}, entitlement = {}) {
  return { subscriber: { entitlements: { pro: { product_identifier: 'monthly', expires_date: future, ...entitlement } }, subscriptions: { monthly: { expires_date: future, is_sandbox: true, store: 'play_store', ...changes } } } };
}
assert.equal(parse(payload(), products, 'sandbox', now).membership_tier, 'standard');
const cancelled = parse(payload({ unsubscribe_detected_at: past }), products, 'sandbox', now);
assert.equal(cancelled.membership_tier, 'standard');
assert.equal(cancelled.auto_renew, false);
assert.equal(cancelled.membership_status, 'cancelled');
assert.equal(parse(payload({ expires_date: past }, { expires_date: past }), products, 'sandbox', now).membership_tier, 'free');
assert.equal(parse(payload({ refunded_at: past }), products, 'sandbox', now).membership_status, 'refunded');
const grace = parse(payload({ expires_date: past, grace_period_expires_date: future, billing_issues_detected_at: past }, { expires_date: past }), products, 'sandbox', now);
assert.equal(grace.membership_status, 'grace_period');
assert.equal(grace.membership_expires_at, future.replace('Z', '.000Z'));
assert.equal(parse(payload({ expires_date: past, billing_issues_detected_at: past }, { expires_date: past }), products, 'sandbox', now).membership_tier, 'free');
assert.equal(parse({ subscriber: { entitlements: {}, subscriptions: {} } }, products, 'sandbox', now).membership_tier, 'free');
for (const data of [null, {}, { subscriber: {} }, payload({ expires_date: 'invalid' }), payload({}, { expires_date: null }), payload({}, { product_identifier: 'unknown' }), payload({ is_sandbox: false }), payload({ store: 'promotional' })]) {
  assert.throws(() => parse(data, products, 'sandbox', now));
}
assert.throws(() => parse(payload(), products, 'production', now));
assert.equal(parse(payload({ is_sandbox: false }), products, 'production', now).membership_tier, 'standard');
assert.equal(parse(payload({ store: 'test_store' }), products, 'sandbox', now).membership_tier, 'standard');
const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
assert.deepEqual(webhookUserIds({ app_user_id: id, aliases: [id, 'someone@example.com', '$RCAnonymousID:123'], transferred_from: [other], transferred_to: [id] }), [id, other]);

async function clientTests() {
  process.env.EXPO_PUBLIC_BILLING_MODE = 'test_store';
  process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY = 'test_example';
  let current = { id };
  let sdkUser;
  let chargedAs;
  let nativeLoads = 0;
  let syncError = false;
  let purchaseError;
  const purchases = {
    isConfigured: async () => !!sdkUser,
    configure: ({ appUserID }) => { sdkUser = appUserID; },
    getAppUserID: async () => sdkUser,
    logIn: async next => { sdkUser = next; },
    purchasePackage: async () => { chargedAs = sdkUser; if (purchaseError) throw purchaseError; },
    restorePurchases: async () => {},
    invalidateCustomerInfoCache: async () => {}, getCustomerInfo: async () => ({}),
    getOfferings: async () => ({ current: { availablePackages: [{ identifier: 'monthly', packageType: 'MONTHLY', product: { priceString: '3,49 €' } }] } }),
  };
  const overrides = {
    'expo-constants': { default: { executionEnvironment: 'standalone' }, ExecutionEnvironment: { StoreClient: 'storeClient' } },
    'react-native': { Platform: { OS: 'android' }, Linking: { openURL: async () => {} } },
    '@/stores/authStore': { useAuthStore: { getState: () => ({ user: current, setUser: value => { current = value; } }) } },
    '@/lib/supabase': { supabase: { functions: { invoke: async () => syncError ? { error: new Error('offline') } : { data: { profile: { id: sdkUser, membership_tier: 'standard', membership_expires_at: future } } } } } },
  };
  Object.defineProperty(overrides, 'react-native-purchases', { get() { nativeLoads++; return { default: purchases }; } });
  const client = load('lib/revenuecat.ts', overrides);
  assert.equal(nativeLoads, 0);
  const plans = await client.getPlans(id);
  assert.equal(plans[0].price, '3,49 €');
  await client.purchasePlan(id, plans[0]);
  assert.equal(chargedAs, id);
  current = { id: other };
  await client.purchasePlan(other, plans[0]);
  assert.equal(chargedAs, other, 'account switch must identify before purchase');
  await assert.rejects(() => client.purchasePlan(id, plans[0]), e => e.reason === 'cancelled');
  current = { id: other };
  syncError = true;
  await assert.rejects(() => client.purchasePlan(other, plans[0]), e => e.reason === 'syncFailed');
  assert.equal(current.membership_tier, undefined, 'SDK success cannot grant Pro without server verification');
  for (const [code, reason] of [['1','cancelled'], ['20','pending'], ['10','uncertain'], ['42','declined'], ['13','linked']]) {
    purchaseError = { code };
    await assert.rejects(() => client.purchasePlan(other, plans[0]), e => e.reason === reason);
  }
  overrides['expo-constants'].default.executionEnvironment = 'storeClient';
  assert.equal(client.isRevenueCatConfigured(), false);
  await assert.rejects(() => client.getPlans(other), e => e.reason === 'unavailable');
}

async function storageTests() {
  const { hardDeleteAccount } = load('supabase/functions/_shared/hardDeleteAccount.ts');
  const files = new Map();
  for (let i = 0; i < 205; i++) files.set(`avatars:${id}/gallery/${i}.jpg`, true);
  files.set(`avatars:${other}/private.jpg`, true);
  for (const bucket of ['listing-photos', 'sitter-listing-photos', 'id-verification']) files.set(`${bucket}:${id}/file.jpg`, true);
  let removedUser;
  let fail = true;
  const admin = { from: () => ({ upsert: async () => ({}) }), storage: {
    listBuckets: async () => ({ data: ['avatars','listing-photos','sitter-listing-photos','id-verification'].map(id => ({ id })) }),
    from: bucket => ({
      list: async (prefix, { offset, limit }) => {
        const entries = new Map();
        for (const key of files.keys()) {
          const start = `${bucket}:${prefix}/`;
          if (!key.startsWith(start)) continue;
          const relative = key.slice(start.length);
          const name = relative.split('/')[0];
          entries.set(name, { name, id: relative.includes('/') ? null : name });
        }
        return { data: [...entries.values()].sort((a,b) => a.name.localeCompare(b.name)).slice(offset, offset + limit) };
      },
      remove: async paths => {
        if (fail) return { error: new Error('storage unavailable') };
        paths.forEach(path => files.delete(`${bucket}:${path}`));
        return {};
      },
    }),
  }, auth: { admin: { deleteUser: async value => { removedUser = value; return {}; } } } };
  await assert.rejects(() => hardDeleteAccount(admin, id), /storage unavailable/);
  assert.equal(removedUser, undefined, 'failed file removal must leave account retryable');
  fail = false;
  await hardDeleteAccount(admin, id);
  assert.equal(removedUser, id);
  assert.deepEqual([...files.keys()], [`avatars:${other}/private.jpg`]);
  await hardDeleteAccount(admin, id); // retry on already removed files
  await assert.rejects(() => hardDeleteAccount(admin, '../'), /Invalid account/);
}

Promise.all([clientTests(), storageTests()]).then(() => {
  const translations = load('lib/i18n/billing.ts');
  const keys = Object.keys(translations.billingDe).sort();
  for (const values of Object.values(translations)) assert.deepEqual(Object.keys(values).sort(), keys);
  console.log('Passed: entitlement expiry/cancellation/grace/refund/environment validation, transfer IDs, native SDK guard, account switching, purchase errors, server-only grants, recursive paginated storage cleanup and 4-language parity.');
}).catch(error => { console.error(error); process.exitCode = 1; });
