// Cloudflare Pages Function — receives rental applications from the site form.
// POST /api/apply  { name, phone, email, property, bedrooms, movein, language, contact_pref, message, ... }
// Stores each lead in the LEADS KV namespace (bind in Pages → Settings → Functions → KV bindings).
// Returns {ok:true} on success. Never throws to the visitor.

export async function onRequestPost({ request, env }) {
  const json = (o, status = 200) =>
    new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  try {
    const d = await request.json().catch(() => ({}));

    // Honeypot: bots fill the hidden "company" field. Pretend success, store nothing.
    if (d.company) return json({ ok: true });

    // Minimal validation: need a name and at least one way to reach them.
    const name = (d.name || "").toString().trim();
    const phone = (d.phone || "").toString().trim();
    const email = (d.email || "").toString().trim();
    if (!name || (!phone && !email)) return json({ ok: false, error: "missing_fields" }, 400);

    const rec = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      receivedAt: new Date().toISOString(),
      name,
      phone,
      email,
      property: (d.property || "").toString().slice(0, 120),
      bedrooms: (d.bedrooms || "").toString().slice(0, 40),
      movein: (d.movein || "").toString().slice(0, 40),
      language: (d.language || "").toString().slice(0, 40),
      contact_pref: (d.contact_pref || "").toString().slice(0, 40),
      message: (d.message || "").toString().slice(0, 3000),
      formLang: (d.lang || "").toString().slice(0, 8),
      submittedFrom: (d.submittedFrom || "").toString().slice(0, 300),
      ip: request.headers.get("cf-connecting-ip") || "",
      ua: request.headers.get("user-agent") || "",
    };

    // Store durably in KV if the binding exists. Key sorts chronologically.
    if (env && env.LEADS && typeof env.LEADS.put === "function") {
      const key = "lead:" + rec.receivedAt + ":" + rec.id;
      await env.LEADS.put(key, JSON.stringify(rec));
    }

    return json({ ok: true, id: rec.id });
  } catch (e) {
    return json({ ok: false, error: "server_error" }, 500);
  }
}

// Optional: simple health check
export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, endpoint: "apply" }), {
    headers: { "content-type": "application/json" },
  });
}
