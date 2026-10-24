export type AdminConfirmAction =
  | "sendInvite"
  | "sendTrialInvite"
  | "recordTrial"
  | "completeTrial"
  | "resendMagicLink"
  | "cancelInvite"
  | "openAsStudent";

export type AdminConfirmVars = {
  name?: string;
  email?: string;
  billingMode?: string;
  amountLabel?: string;
  waived?: boolean;
  whenLabel?: string;
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
    case "sendTrialInvite":
      return {
        title: vars.waived ? "Send complimentary trial?" : "Send trial invite?",
        body: vars.waived
          ? `Email ${who} a complimentary trial invite (no payment). Creates a pending account and books the lesson time.`
          : `Email ${who} a trial invite${
              vars.amountLabel ? ` for ${vars.amountLabel}` : ""
            } with a Stripe pay link. Creates a pending account until they pay / continue.`,
        confirmLabel: vars.waived ? "Send complimentary trial" : "Send trial invite",
      };
    case "recordTrial":
      return {
        title: vars.waived ? "Record complimentary trial?" : "Record trial lesson?",
        body: vars.waived
          ? `Add a complimentary trial${
              vars.whenLabel ? ` on ${vars.whenLabel}` : ""
            } to ${who}'s account. It will show on their schedule and payment history. No email unless you opted in.`
          : `Add a trial lesson${
              vars.amountLabel ? ` (${vars.amountLabel})` : ""
            }${
              vars.whenLabel ? ` on ${vars.whenLabel}` : ""
            } to ${who}'s account. It will show on their schedule and billing. No email unless you opted in.`,
        confirmLabel: vars.waived ? "Record complimentary trial" : "Record trial",
      };
    case "completeTrial":
      return {
        title: "Mark trial complete?",
        body: `Mark the trial${
          vars.whenLabel ? ` on ${vars.whenLabel}` : ""
        } for ${who} as completed. It stays on their schedule as finished.`,
        confirmLabel: "Mark complete",
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
