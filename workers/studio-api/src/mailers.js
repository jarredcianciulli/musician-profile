import {
  escapeHtml,
  sendTransactionalEmail,
  studioInbox,
} from "./brevo.js";

function formatWhen(iso, timezone = "America/New_York") {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const day = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(d);
    const time = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
    return `${day} at ${time}`;
  } catch {
    return iso;
  }
}

function formatLabel(format) {
  if (format === "online") return "Online (video)";
  return "In person (Bowan Village area)";
}

function siteBase(env) {
  return (env.WEBSITE_DOMAIN || "https://batterystringstudio.com").replace(
    /\/$/,
    ""
  );
}

function wrap(inner) {
  return `<div style="font-family:Georgia,serif;line-height:1.5;color:#1a1a1a;max-width:560px">
${inner}
<p style="margin-top:28px;font-size:13px;color:#666">Battery String Studio · Charleston / Bowan Village area</p>
</div>`;
}

export async function sendTrialBookedEmails(env, booking) {
  const inbox = studioInbox(env);
  const when = formatWhen(booking.start);
  const format = formatLabel(booking.format);
  const name = booking.name || "Student";
  const email = booking.email || "";
  const amount = ((booking.amountCents || 3500) / 100).toFixed(0);
  const street = (env.STUDIO_STREET_ADDRESS || "").trim();
  const locationLine =
    booking.format === "online"
      ? "You'll receive a video link by email before the lesson."
      : street
        ? `Home studio address: ${street}`
        : "Home studio in the Bowan Village area — reply if you need the address again.";

  const studio = await sendTransactionalEmail(env, {
    to: inbox,
    toName: "Battery String Studio",
    subject: `New trial booked — ${name}`,
    html: wrap(`
      <h2 style="font-weight:600">New $35 trial</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>When:</strong> ${escapeHtml(when)}</p>
      <p><strong>Format:</strong> ${escapeHtml(format)}</p>
      <p><strong>Duration:</strong> ${escapeHtml(String(booking.durationMinutes || 30))} min</p>
      ${booking.notes ? `<p><strong>Notes:</strong> ${escapeHtml(booking.notes)}</p>` : ""}
      <p><strong>Booking ID:</strong> ${escapeHtml(booking.id)}</p>
    `),
    replyTo: email ? { email, name } : undefined,
  });
  if (!studio.ok && !studio.skipped) {
    throw new Error(
      `Studio trial email failed: ${studio.status || ""} ${studio.details || ""}`
    );
  }
  if (studio.skipped) {
    throw new Error("BREVO_API_KEY not set — skipped trial emails");
  }

  if (email) {
    const client = await sendTransactionalEmail(env, {
      to: email,
      toName: name,
      subject: "You're booked — Battery String Studio trial",
      html: wrap(`
        <h2 style="font-weight:600">You're booked</h2>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Your $${amount} trial lesson is confirmed.</p>
        <p><strong>When:</strong> ${escapeHtml(when)}<br/>
        <strong>Format:</strong> ${escapeHtml(format)}<br/>
        <strong>Length:</strong> ${escapeHtml(String(booking.durationMinutes || 30))} minutes</p>
        <p>${escapeHtml(locationLine)}</p>
        <p>Questions? Just reply to this email.</p>
        <p><a href="${siteBase(env)}">batterystringstudio.com</a></p>
      `),
      replyTo: { email: inbox, name: "Battery String Studio" },
    });
    if (!client.ok) {
      throw new Error(
        `Client trial email failed: ${client.status || ""} ${client.details || ""}`
      );
    }
  }
}

export async function sendSubscriptionBookedEmails(env, sub, reservation) {
  const inbox = studioInbox(env);
  const start = sub.slotStart || reservation?.start || "";
  const when = formatWhen(start);
  const format = formatLabel(sub.format || reservation?.format);
  const name = sub.name || reservation?.name || "Student";
  const email = sub.email || reservation?.email || "";
  const mins = sub.durationMinutes || reservation?.durationMinutes || 45;

  const studio = await sendTransactionalEmail(env, {
    to: inbox,
    toName: "Battery String Studio",
    subject: `New subscription — ${name}`,
    html: wrap(`
      <h2 style="font-weight:600">New weekly subscription</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>First / weekly slot:</strong> ${escapeHtml(when)}</p>
      <p><strong>Duration:</strong> ${escapeHtml(String(mins))} min</p>
      <p><strong>Format:</strong> ${escapeHtml(format)}</p>
      <p><strong>Stripe sub:</strong> ${escapeHtml(sub.stripeSubscriptionId || "—")}</p>
    `),
    replyTo: email ? { email, name } : undefined,
  });
  if (!studio.ok) {
    throw new Error(
      studio.skipped
        ? "BREVO_API_KEY not set — skipped subscription emails"
        : `Studio subscription email failed: ${studio.status || ""} ${studio.details || ""}`
    );
  }

  if (email) {
    const client = await sendTransactionalEmail(env, {
      to: email,
      toName: name,
      subject: "Your weekly lesson is reserved — Battery String Studio",
      html: wrap(`
        <h2 style="font-weight:600">Welcome</h2>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Your weekly ${escapeHtml(String(mins))}-minute lesson spot is reserved.</p>
        <p><strong>Starting:</strong> ${escapeHtml(when)}<br/>
        <strong>Format:</strong> ${escapeHtml(format)}</p>
        <p>Tuition renews monthly. Reply anytime with questions — looking forward to working with you.</p>
        <p><a href="${siteBase(env)}">batterystringstudio.com</a></p>
      `),
      replyTo: { email: inbox, name: "Battery String Studio" },
    });
    if (!client.ok) {
      throw new Error(
        `Client subscription email failed: ${client.status || ""} ${client.details || ""}`
      );
    }
  }
}

/** Studio alert + optional client auto-reply for /lead form. */
export async function sendLeadEmails(env, lead) {
  const inbox = studioInbox(env);
  const name = lead.name || "Lead";
  const email = lead.email || "";
  const phone = lead.phone || "";

  const studio = await sendTransactionalEmail(env, {
    to: inbox,
    toName: "Battery String Studio",
    subject: `New lead — ${name}`,
    html: wrap(`
      <h2 style="font-weight:600">New lead</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email || "—")}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone || "—")}</p>
      <p><strong>Source:</strong> ${escapeHtml(lead.source || "lead_form")}</p>
      ${lead.flyer ? `<p><strong>Flyer:</strong> ${escapeHtml(lead.flyer)}</p>` : ""}
      ${lead.utmSource || lead.utmCampaign ? `<p><strong>UTM:</strong> ${escapeHtml([lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / "))}</p>` : ""}
      ${lead.notes ? `<p><strong>Notes:</strong> ${escapeHtml(lead.notes)}</p>` : ""}
      <p><a href="${siteBase(env)}/admin">Open admin</a></p>
    `),
    replyTo: email ? { email, name } : undefined,
  });
  if (!studio.ok) {
    throw new Error(
      studio.skipped
        ? "BREVO_API_KEY not set — skipped lead emails"
        : `Studio lead email failed: ${studio.status || ""} ${studio.details || ""}`
    );
  }

  if (email) {
    const client = await sendTransactionalEmail(env, {
      to: email,
      toName: name,
      subject: "Thanks for reaching out — Battery String Studio",
      html: wrap(`
        <h2 style="font-weight:600">Thanks, ${escapeHtml(name)}</h2>
        <p>We got your message and will follow up soon.</p>
        <p>Prefer to pick a time now? Book a $35 trial:</p>
        <p><a href="${siteBase(env)}/trial">Book your trial</a></p>
      `),
      replyTo: { email: inbox, name: "Battery String Studio" },
    });
    if (!client.ok) {
      throw new Error(
        `Client lead email failed: ${client.status || ""} ${client.details || ""}`
      );
    }
  }
}
