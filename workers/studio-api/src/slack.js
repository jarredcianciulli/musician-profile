/**
 * Slack Incoming Webhook helpers (soft-fail — never block auth).
 * Set secret: npx wrangler secret put SLACK_WEBHOOK_URL
 */

export async function notifySlack(env, text) {
  const url = (env.SLACK_WEBHOOK_URL || "").trim();
  if (!url || !text) return { ok: false, skipped: true };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: String(text).slice(0, 3000) }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Slack webhook failed:", res.status, body.slice(0, 200));
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (err) {
    console.error("Slack webhook error:", err?.message || err);
    return { ok: false, error: String(err?.message || err) };
  }
}
