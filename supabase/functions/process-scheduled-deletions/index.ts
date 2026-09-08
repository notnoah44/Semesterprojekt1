// Retired: account deletion is now immediate and explicitly user-triggered.
Deno.serve(() => new Response(JSON.stringify({ error: 'Scheduled account deletion has been retired' }), {
  status: 410, headers: { 'Content-Type': 'application/json' },
}));
