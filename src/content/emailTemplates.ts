/** Catalog of transactional emails the studio sends (admin reference). */

export type EmailTemplateDef = {
  id: string;
  name: string;
  audience: "student" | "studio" | "lead";
  subject: string;
  description: string;
  /** Plain-text outline of the body for admin preview */
  outline: string[];
};

export const EMAIL_TEMPLATES: EmailTemplateDef[] = [
  {
    id: "student_invite",
    name: "Student account invite",
    audience: "student",
    subject: "Your Battery String Studio account — set up billing",
    description:
      "Magic-link invite after Admin sends an invite or resends a sign-in link.",
    outline: [
      "Welcome + name",
      "Billing blurb (auto-charge or pay what’s due)",
      "Note about confirming studio policy at checkout",
      "Open your account button (magic link)",
      "Request a new sign-in link + studio email fallback",
    ],
  },
  {
    id: "trial_client",
    name: "Trial confirmation (student)",
    audience: "student",
    subject: "You're booked — Battery String Studio trial",
    description: "Sent after a $35 trial Checkout completes.",
    outline: [
      "You're booked",
      "When / format / length",
      "Location or video-link note",
      "Reply for questions",
    ],
  },
  {
    id: "trial_studio",
    name: "Trial alert (studio)",
    audience: "studio",
    subject: "New trial booked — {name}",
    description: "Internal alert when a trial is paid.",
    outline: ["Name, email, when, format, duration, notes, booking id"],
  },
  {
    id: "subscription_client",
    name: "Subscription confirmation (student)",
    audience: "student",
    subject: "Your weekly lesson is reserved — Battery String Studio",
    description: "Sent after public subscribe or portal auto-setup succeeds.",
    outline: ["Welcome", "Weekly slot", "Format", "Monthly tuition note"],
  },
  {
    id: "subscription_studio",
    name: "Subscription alert (studio)",
    audience: "studio",
    subject: "New subscription — {name}",
    description: "Internal alert for a new weekly subscription.",
    outline: ["Name, email, slot, duration, Stripe sub id"],
  },
  {
    id: "lead_client",
    name: "Lead / contact thank-you",
    audience: "lead",
    subject: "Thanks for reaching out — Battery String Studio",
    description: "Auto-reply after /lead or contact form.",
    outline: ["Thanks", "We’ll follow up", "Link to book a $35 trial"],
  },
  {
    id: "lead_studio",
    name: "Lead / contact alert (studio)",
    audience: "studio",
    subject: "New lead — {name} / Website contact — {name}",
    description: "Internal alert for inbound lead or contact message.",
    outline: ["Name, email, phone, source, flyer/UTM, message"],
  },
];

export function emailTemplateById(id: string) {
  return EMAIL_TEMPLATES.find((t) => t.id === id) || null;
}
