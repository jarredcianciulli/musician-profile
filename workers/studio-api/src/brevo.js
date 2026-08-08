/**
 * Brevo Transactional SMTP helper for studio-api.
 * Soft-fails: callers should not fail Stripe webhooks if email fails.
 */

export async function sendTransactionalEmail(env, { to, toName, subject, html, replyTo }) {
  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("BREVO_API_KEY not set — skipping email:", subject);
    return { ok: false, skipped: true };
  }

  const fromEmail = env.FROM_EMAIL || env.TO_EMAIL || "jarred@batterystringstudio.com";
  const fromName = env.FROM_NAME || "Battery String Studio";

  const body = {
    sender: { email: fromEmail, name: fromName },
    to: [{ email: to, name: toName || to }],
    subject,
    htmlContent: html,
  };
  if (replyTo) {
    body.replyTo = {
      email: replyTo.email || replyTo,
      name: replyTo.name || replyTo.email || replyTo,
    };
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const details = await res.text();
    console.error("Brevo send failed:", res.status, details);
    return { ok: false, status: res.status, details };
  }
  return { ok: true };
}

export function studioInbox(env) {
  return env.TO_EMAIL || env.FROM_EMAIL || "jarred@batterystringstudio.com";
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
