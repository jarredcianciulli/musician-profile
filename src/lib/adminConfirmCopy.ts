export type AdminConfirmAction =
  | "sendInvite"
  | "resendMagicLink"
  | "cancelInvite"
  | "openAsStudent";

export type AdminConfirmVars = {
  name?: string;
  email?: string;
  billingMode?: string;
};

export type AdminConfirmCopy = {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
};

/** Switch-case copy for common admin confirms. */
export function getAdminConfirmCopy(
  action: AdminConfirmAction,
  vars: AdminConfirmVars = {}
): AdminConfirmCopy {
  const name = vars.name?.trim() || "this student";
  const email = vars.email?.trim() || "";
  const who = email ? `${name} (${email})` : name;

  switch (action) {
    case "sendInvite":
      return {
        title: "Send invite?",
        body: `Email a magic sign-in link to ${who}${
          vars.billingMode
            ? ` for ${vars.billingMode === "auto" ? "auto-charge" : "pay-by-link"} billing`
            : ""
        }. They’ll be able to open their account and set up payment.`,
        confirmLabel: "Send invite",
      };
    case "resendMagicLink":
      return {
        title: "Resend magic link?",
        body: `Generate a new sign-in link and email it to ${who}. Any previous unused invite link for them will stop working.`,
        confirmLabel: "Resend link",
      };
    case "cancelInvite":
      return {
        title: "Cancel invite?",
        body: `Cancel the pending invite for ${who}? Their magic link will stop working and any open Stripe checkout will be cancelled. This cannot be undone from the portal.`,
        confirmLabel: "Cancel invite",
        danger: true,
      };
    case "openAsStudent":
      return {
        title: "Open student portal?",
        body: `Create a one-time, 15-minute link and open ${who}’s account in a new tab. Slack will be notified. Don’t share this URL.`,
        confirmLabel: "Open as student",
      };
    default:
      return {
        title: "Are you sure?",
        body: "Please confirm to continue.",
        confirmLabel: "Confirm",
      };
  }
}
