const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, overrides = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => overrides[name] ?? require(name), module, module.exports);
  return module.exports;
}
const { registerSchema } = load('lib/utils/validators.ts');
const base = { email: 'test@example.com', firstName: 'Noah', lastName: 'Test', password: 'abcdefgh', confirmPassword: 'abcdefgh' };
assert.equal(registerSchema.safeParse(base).success, true);
const mismatch = registerSchema.safeParse({ ...base, confirmPassword: 'different' });
assert.equal(mismatch.success, false);
assert.deepEqual(mismatch.error.issues[0].path, ['confirmPassword']);
assert.equal(registerSchema.safeParse({ ...base, confirmPassword: undefined }).success, false);
assert.equal(registerSchema.safeParse({ ...base, password: 'short', confirmPassword: 'short' }).success, false);
const { toDateString, fromDateString, formatDate } = load('lib/utils/formatDate.ts');
for (const zone of ['Europe/Berlin', 'America/Los_Angeles', 'Pacific/Auckland']) {
  process.env.TZ = zone;
  for (const date of ['2026-09-07', '2026-03-29', '2026-10-25']) {
    assert.equal(toDateString(fromDateString(date)), date, `${zone}: local midnight must keep the selected calendar day`);
    assert.equal(formatDate(date, 'en-GB').startsWith(date.slice(-2)), true, `${zone}: displayed day must not shift`);
  }
}
console.log('Passed: registration matching/missing/short passwords and calendar dates across 3 time zones (including DST dates).');

// Reproduce the pre-migration database response without accessing user data.
function chatApi(hiddenResult) {
  const results = {
    conversations: { data: [
      { id: 'older', created_at: '2026-01-01', messages: [] },
      { id: 'latest', created_at: '2025-01-01', messages: [{ created_at: '2026-09-07', content: 'Hello' }] },
    ], error: null },
    conversation_hidden: hiddenResult,
  };
  const supabase = { from(table) {
    const builder = { then(resolve, reject) { return Promise.resolve(results[table]).then(resolve, reject); } };
    for (const method of ['select', 'or', 'order', 'limit', 'eq']) builder[method] = () => builder;
    return builder;
  } };
  return load('lib/api/chat.ts', { '@/lib/supabase': { supabase } });
}
(async () => {
  const missing = { code: 'PGRST205', message: "Could not find the table 'public.conversation_hidden' in the schema cache" };
  assert.deepEqual((await chatApi({ data: null, error: missing }).getConversations('user')).map(c => c.id), ['latest', 'older']);
  assert.deepEqual((await chatApi({ data: [{ conversation_id: 'latest' }], error: null }).getConversations('user')).map(c => c.id), ['older']);
  for (const error of [
    { code: '42501', message: 'permission denied for conversation_hidden' },
    { code: '', message: 'fetch failed' },
    { code: 'PGRST205', message: 'Could not find another_table' },
  ]) await assert.rejects(() => chatApi({ data: null, error }).getConversations('user'), e => e === error);
  console.log('Passed: chats load before migration, hidden chats stay hidden, and unrelated database/network errors are not suppressed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
