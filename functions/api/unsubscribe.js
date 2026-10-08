// POST /api/unsubscribe {t} — mailing-list opt-out via token.
const SUPA_URL = "https://mtieaukygxrcnggstvjf.supabase.co";
const SUPA_KEY = "sb_publishable_2O_tZWnUVt9wtz-LDJ55fQ_G8kEObt3";
export async function onRequestPost({ request, env }) {
  const { t } = await request.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/i.test(t || "")) return new Response('{"ok":false}', { status: 400, headers: { "content-type": "application/json" } });
  const key = (env && env.SUPABASE_ANON_KEY) || SUPA_KEY;
  const r = await fetch(SUPA_URL + "/rest/v1/rpc/unsubscribe", {
    method: "POST", headers: { apikey: key, authorization: "Bearer " + key, "content-type": "application/json" }, body: JSON.stringify({ p_token: t }),
  });
  return new Response(JSON.stringify({ ok: r.ok }), { headers: { "content-type": "application/json" } });
}
