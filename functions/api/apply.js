export async function onRequestPost(ctx) {
    const request = ctx.request, env = ctx.env;
    const json = (o, status) => new Response(JSON.stringify(o), { status: status || 200, headers: { "content-type": "application/json" } });
    try {
          const d = await request.json().catch(function(){ return {}; });
          if (d.company) return json({ ok: true });
          const name = String(d.name || "").trim();
          const phone = String(d.phone || "").trim();
          const email = String(d.email || "").trim();
          if (!name || (!phone && !email)) return json({ ok: false, error: "missing_fields" }, 400);
          const rec = {
                  id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
                  receivedAt: new Date().toISOString(),
                  name: name, phone: phone, email: email,
                  property: String(d.property || "").slice(0, 120),
                  bedrooms: String(d.bedrooms || "").slice(0, 40),
                  movein: String(d.movein || "").slice(0, 40),
                  language: String(d.language || "").slice(0, 40),
                  contact_pref: String(d.contact_pref || "").slice(0, 40),
                  message: String(d.message || "").slice(0, 3000),
                  formLang: String(d.lang || "").slice(0, 8),
                  submittedFrom: String(d.submittedFrom || "").slice(0, 300),
                  ip: request.headers.get("cf-connecting-ip") || "",
                  ua: request.headers.get("user-agent") || ""
          };
          if (env && env.LEADS && typeof env.LEADS.put === "function") {
                  await env.LEADS.put("lead:" + rec.receivedAt + ":" + rec.id, JSON.stringify(rec));
          }
          return json({ ok: true, id: rec.id });
    } catch (e) {
          return json({ ok: false, error: "server_error" }, 500);
    }
}

export async function onRequestGet() {
    return new Response(JSON.stringify({ ok: true, endpoint: "apply" }), { headers: { "content-type": "application/json" } });
}
