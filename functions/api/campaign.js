// /api/campaign — GET: is sending configured?  POST {campaign_id, test}: send a campaign to the mailing list via Resend.
// Auth: caller's Supabase session token; all reads go through RLS (admins only).
// Env: RESEND_API_KEY (required to send), MAIL_FROM (default "Gamino Real Estate <avisos@gaminorealestate.com>").
const SUPA_URL = "https://mtieaukygxrcnggstvjf.supabase.co";
const SUPA_KEY = "sb_publishable_2O_tZWnUVt9wtz-LDJ55fQ_G8kEObt3";
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

export async function onRequestGet({ env }) {
  return json({ ok: true, configured: !!(env && env.RESEND_API_KEY) });
}

export async function onRequestPost({ request, env }) {
  if (!env || !env.RESEND_API_KEY) return json({ ok: false, error: "RESEND_API_KEY not set" }, 503);
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ ok: false, error: "unauthorized" }, 401);
  const key = env.SUPABASE_ANON_KEY || SUPA_KEY;
  const H = { apikey: key, authorization: "Bearer " + token, "content-type": "application/json" };
  const get = (path) => fetch(SUPA_URL + "/rest/v1/" + path, { headers: H }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

  const { campaign_id, test } = await request.json().catch(() => ({}));
  try {
    const user = await fetch(SUPA_URL + "/auth/v1/user", { headers: H }).then((r) => (r.ok ? r.json() : null));
    if (!user) return json({ ok: false, error: "unauthorized" }, 401);
    const [prof] = await get("profiles?select=role,email&id=eq." + user.id);
    if (!prof || prof.role !== "admin") return json({ ok: false, error: "forbidden" }, 403);
    const [c] = await get("campaigns?select=*&id=eq." + encodeURIComponent(campaign_id));
    if (!c) return json({ ok: false, error: "campaign not found" }, 404);
    if (c.status === "sent" && !test) return json({ ok: false, error: "already sent" }, 409);

    const list = test
      ? [{ email: prof.email, lang: "es", token: "00000000-0000-0000-0000-000000000000" }]
      : await get("subscribers?select=email,lang,token&unsubscribed_at=is.null");
    const from = env.MAIL_FROM || "Gamino Real Estate <avisos@gaminorealestate.com>";
    const site = "https://gaminorealestate.com";
    const escp = (s) => String(s || "").replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
    const render = (s) => {
      const en = s.lang === "en";
      const subject = (en ? c.subject_en : c.subject_es) || c.subject_es || c.subject_en || c.name;
      const text = (en ? c.body_en : c.body_es) || c.body_es || c.body_en || "";
      const unsub = site + "/baja/?t=" + s.token;
      const html = `<div style="background:#f7f2e9;padding:24px 12px;font-family:Georgia,serif"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;border:1px solid #e4d9c4">
<img src="${site}/logo-crest-gold.jpg" width="56" height="56" alt="Gamino Real Estate" style="border-radius:12px"/>
<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#131009;margin-top:14px;white-space:pre-line">${escp(text)}</div>
<p style="margin-top:22px"><a href="${site}/#disponibles" style="background:#b3872f;color:#fff;text-decoration:none;padding:12px 20px;border-radius:9px;font-family:Arial,sans-serif;font-weight:bold">${en ? "See what's available" : "Ver disponibles"}</a></p>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#6d5f49;margin-top:26px">Gamino Real Estate · Milwaukee, WI · (414) 850-CASA<br><a href="${unsub}" style="color:#6d5f49">${en ? "Unsubscribe" : "Darme de baja"}</a></p></div></div>`;
      return { from, to: [s.email], subject, html, text: text + "\n\n" + (en ? "Unsubscribe: " : "Darme de baja: ") + unsub, headers: { "List-Unsubscribe": "<" + unsub + ">" } };
    };

    let sent = 0;
    for (let i = 0; i < list.length; i += 100) {
      const r = await fetch("https://api.resend.com/emails/batch", {
        method: "POST", headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
        body: JSON.stringify(list.slice(i, i + 100).map(render)),
      });
      if (!r.ok) return json({ ok: false, error: "resend " + r.status + " " + (await r.text()).slice(0, 200), sent }, 502);
      sent += Math.min(100, list.length - i);
    }
    if (!test) {
      await fetch(SUPA_URL + "/rest/v1/campaigns?id=eq." + c.id, {
        method: "PATCH", headers: H, body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString(), sent_count: sent }),
      });
    }
    return json({ ok: true, sent });
  } catch (e) {
    return json({ ok: false, error: "server_error " + e }, 500);
  }
}
