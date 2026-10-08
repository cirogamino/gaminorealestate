// POST /api/maintenance — tenant repair request from /mantenimiento → Supabase submit_maintenance().
const SUPA_URL = "https://mtieaukygxrcnggstvjf.supabase.co";
const SUPA_KEY = "sb_publishable_2O_tZWnUVt9wtz-LDJ55fQ_G8kEObt3";

export async function onRequestPost({ request, env }) {
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  try {
    const d = await request.json().catch(() => ({}));
    if (d.company) return json({ ok: true });
    const s = (v, n) => (v || "").toString().trim().slice(0, n);
    const body = {
      p_name: s(d.name, 120), p_phone: s(d.phone, 40), p_building: s(d.building, 120), p_unit: s(d.unit, 40),
      p_issue: s(d.issue, 4000), p_urgency: ["normal", "urgent", "emergency"].includes(d.urgency) ? d.urgency : "normal",
      p_best_time: s(d.best_time, 120),
    };
    if (!body.p_phone || !body.p_issue) return json({ ok: false, error: "missing_fields" }, 400);
    const key = (env && env.SUPABASE_ANON_KEY) || SUPA_KEY;
    const r = await fetch(SUPA_URL + "/rest/v1/rpc/submit_maintenance", {
      method: "POST", headers: { apikey: key, authorization: "Bearer " + key, "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (env && env.LEADS && typeof env.LEADS.put === "function") {
      await env.LEADS.put("maint:" + new Date().toISOString(), JSON.stringify({ ...body, stored: r.ok })).catch(() => {});
    }
    if (!r.ok) return json({ ok: false, error: "store_failed" }, 502);
    return json({ ok: true, id: await r.json() });
  } catch (e) {
    return json({ ok: false, error: "server_error" }, 500);
  }
}
