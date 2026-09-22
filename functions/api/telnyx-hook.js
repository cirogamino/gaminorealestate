// Cloudflare Pages Function — receives the Telnyx AI assistant's notify_office webhook tool call
// (fired mid-call / end-of-call on the (414) 850-CASA line) and files the lead.
// POST /api/telnyx-hook  { caller_name, caller_number, intent, property_interest, timeline, summary }
// Falls back to the same ingest + KV pattern as /api/apply. Never throws to the caller.

export async function onRequestPost({ request, env }) {
  const json = (o, status = 200) =>
    new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  try {
    const d = await request.json().catch(() => ({}));

    const name = (d.caller_name || "").toString().trim();
    const phone = (d.caller_number || "").toString().trim();
    const summary = (d.summary || "").toString().slice(0, 2000);
    if (!phone && !name) return json({ ok: false, error: "missing_fields" }, 400);

    const rec = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      receivedAt: new Date().toISOString(),
      channel: "ai_receptionist_call",
      name: name || "(no name captured)",
      phone,
      intent: (d.intent || "").toString().slice(0, 80),
      property_interest: (d.property_interest || "").toString().slice(0, 160),
      timeline: (d.timeline || "").toString().slice(0, 80),
      summary,
      ip: request.headers.get("cf-connecting-ip") || "",
      ua: request.headers.get("user-agent") || "",
    };

    if (env && env.LEADS && typeof env.LEADS.put === "function") {
      const key = "lead:" + rec.receivedAt + ":" + rec.id;
      await env.LEADS.put(key, JSON.stringify(rec));
    }

    // Mirror into Supabase (source of truth) — same ingest the site forms use.
    try {
      const ingestUrl = (env && env.INGEST_URL) || "https://mtieaukygxrcnggstvjf.supabase.co/functions/v1/ingest-lead";
      const ingestToken = (env && env.INGEST_TOKEN) || "gamino_2026_ingest_x7q2";
      await fetch(ingestUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "x-gamino-token": ingestToken },
        body: JSON.stringify({
          source: "ai_receptionist_call",
          name: rec.name,
          phone: rec.phone,
          email: "",
          property_interest: rec.property_interest,
          preferred_language: "unknown",
          preferred_contact: "phone",
          message: `[${rec.intent || "call"} | ${rec.timeline || "timeline unknown"}] ${summary}`,
          submittedFrom: "telnyx-casa-line",
        }),
      });
    } catch (_) { /* non-fatal */ }

    return json({ ok: true, id: rec.id });
  } catch (e) {
    return json({ ok: true }); // never break the caller's experience
  }
}

export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, endpoint: "telnyx-hook" }), {
    headers: { "content-type": "application/json" },
  });
}
