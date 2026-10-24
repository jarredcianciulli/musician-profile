/**
 * Persist outbound transactional emails on the studio KV payload.
 */

import { sendTransactionalEmail } from "./brevo.js";

function newId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export function appendEmailLog(payload, record) {
  const emails = [record, ...(payload.emails || [])].slice(0, 500);
  return {
    ...payload,
    emails,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Send via Brevo and append a log row (success or failure).
 * @returns {{ payload, result, record }}
 */
export async function sendAndLogEmail(env, payload, {
  templateId,
  enrollmentId = "",
  to,
  toName,
  subject,
  html,
  replyTo,
}) {
  const result = await sendTransactionalEmail(env, {
    to,
    toName,
    subject,
    html,
    replyTo,
  });

  let status = "sent";
  let error = "";
  if (result.skipped) {
    status = "skipped";
    error = "BREVO_API_KEY not set";
  } else if (!result.ok) {
    status = "failed";
    error = `${result.status || ""} ${result.details || "send failed"}`.trim();
  }

  const htmlRaw = String(html || "");
  const record = {
    id: newId("eml"),
    templateId: templateId || "unknown",
    enrollmentId: enrollmentId || "",
    to: String(to || "").toLowerCase(),
    toName: toName || "",
    subject: subject || "",
    status,
    error: error.slice(0, 800),
    createdAt: new Date().toISOString(),
    /** Full HTML as sent (capped for KV size). */
    html: htmlRaw.slice(0, 48000),
    /** Short plain preview for list rows */
    preview: htmlRaw
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 280),
  };

  return {
    payload: appendEmailLog(payload, record),
    result,
    record,
  };
}
