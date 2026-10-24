/** Sample HTML for admin template previews (mirrors studio-api mailers). */

function wrap(inner: string) {
  return `<div style="font-family:Georgia,serif;line-height:1.5;color:#1a1a1a;max-width:560px">
${inner}
<p style="margin-top:28px;font-size:13px;color:#666">Battery String Studio · Charleston / Bowan Village area</p>
</div>`;
}

const SITE = "https://batterystringstudio.com";
const INBOX = "jarred@batterystringstudio.com";

export function sampleHtmlForTemplate(templateId: string): string {
  switch (templateId) {
    case "student_invite":
      return wrap(`
      <h2 style="font-weight:600">Welcome, Alex</h2>
      <p>Your weekly lesson spot is ready. Open your account to see your schedule and <strong>pay what’s due</strong> for this period.</p>
      <p style="font-size:14px;color:#444;line-height:1.5">You’ll confirm the <a href="${SITE}/policy">studio policy</a> when you set up billing — it covers tuition, reserved weekly slots, and make-ups.</p>
      <p><a href="${SITE}/account" style="display:inline-block;padding:12px 18px;background:#1b3a5c;color:#fff;text-decoration:none">Open your account</a></p>
      <p style="font-size:13px;color:#666;margin-top:20px">This sign-in link expires in 48 hours. If it expires, request a new one here:</p>
      <p><a href="${SITE}/account" style="display:inline-block;padding:12px 18px;border:1px solid #1b3a5c;color:#1b3a5c;text-decoration:none">Request a new sign-in link</a></p>
      <p style="font-size:13px;color:#666">Or email <a href="mailto:${INBOX}">${INBOX}</a> and we&apos;ll resend it.</p>
    `);
    case "trial_invite":
      return wrap(`
      <h2 style="font-weight:600">You're invited, Alex</h2>
      <p>Your <strong>30-minute trial</strong> is reserved. Pay <strong>$35</strong> to confirm the spot.</p>
      <p><strong>When:</strong> Saturday, November 1, 2026 at 10:00 AM<br/>
      <strong>Format:</strong> In person (Bowan Village area)</p>
      <p><a href="${SITE}/trial" style="display:inline-block;padding:12px 18px;background:#1b3a5c;color:#fff;text-decoration:none">Pay $35 for your trial</a></p>
      <p style="font-size:14px;color:#444">You can also open your account (schedule and next steps):</p>
      <p><a href="${SITE}/account" style="display:inline-block;padding:12px 18px;border:1px solid #1b3a5c;color:#1b3a5c;text-decoration:none">Open your account</a></p>
    `);
    case "trial_invite_waived":
      return wrap(`
      <h2 style="font-weight:600">You're invited, Alex</h2>
      <p>You're set for a <strong>complimentary 30-minute trial</strong> — no payment needed.</p>
      <p><strong>When:</strong> Saturday, November 1, 2026 at 10:00 AM<br/>
      <strong>Format:</strong> In person (Bowan Village area)</p>
      <p>Open your account anytime to see details and, when you're ready, set up weekly lessons.</p>
      <p><a href="${SITE}/account" style="display:inline-block;padding:12px 18px;background:#1b3a5c;color:#fff;text-decoration:none">Open your account</a></p>
    `);
    case "trial_client":
      return wrap(`
        <h2 style="font-weight:600">You're booked</h2>
        <p>Hi Alex,</p>
        <p>Your $35 trial lesson is confirmed.</p>
        <p><strong>When:</strong> Saturday, November 1, 2026 at 10:00 AM<br/>
        <strong>Format:</strong> In person (Bowan Village area)<br/>
        <strong>Length:</strong> 30 minutes</p>
        <p>Home studio in the Bowan Village area — reply if you need the address again.</p>
        <p>Questions? Just reply to this email.</p>
        <p><a href="${SITE}">batterystringstudio.com</a></p>
      `);
    case "trial_studio":
      return wrap(`
      <h2 style="font-weight:600">New $35 trial</h2>
      <p><strong>Name:</strong> Alex Example</p>
      <p><strong>Email:</strong> alex@example.com</p>
      <p><strong>When:</strong> Saturday, November 1, 2026 at 10:00 AM</p>
      <p><strong>Format:</strong> In person (Bowan Village area)</p>
      <p><strong>Duration:</strong> 30 min</p>
      <p><strong>Booking ID:</strong> book_example</p>
    `);
    case "subscription_client":
      return wrap(`
        <h2 style="font-weight:600">Welcome</h2>
        <p>Hi Alex,</p>
        <p>Your weekly 45-minute lesson spot is reserved.</p>
        <p><strong>Starting:</strong> Thursday, October 23, 2026 at 4:00 PM<br/>
        <strong>Format:</strong> In person (Bowan Village area)</p>
        <p>Tuition renews monthly. Reply anytime with questions — looking forward to working with you.</p>
        <p><a href="${SITE}">batterystringstudio.com</a></p>
      `);
    case "subscription_studio":
      return wrap(`
      <h2 style="font-weight:600">New weekly subscription</h2>
      <p><strong>Name:</strong> Alex Example</p>
      <p><strong>Email:</strong> alex@example.com</p>
      <p><strong>First / weekly slot:</strong> Thursday, October 23, 2026 at 4:00 PM</p>
      <p><strong>Duration:</strong> 45 min</p>
      <p><strong>Format:</strong> In person (Bowan Village area)</p>
      <p><strong>Stripe sub:</strong> sub_example</p>
    `);
    case "lead_client":
      return wrap(`
        <h2 style="font-weight:600">Thanks, Alex</h2>
        <p>We got your message and will follow up soon.</p>
        <p>Prefer to pick a time now? Book a $35 trial:</p>
        <p><a href="${SITE}/trial">Book your trial</a></p>
      `);
    case "lead_studio":
      return wrap(`
      <h2 style="font-weight:600">New lead</h2>
      <p><strong>Name:</strong> Alex Example</p>
      <p><strong>Email:</strong> alex@example.com</p>
      <p><strong>Phone:</strong> —</p>
      <p><strong>Source:</strong> lead_form</p>
      <p><a href="${SITE}/admin">Open admin</a></p>
    `);
    default:
      return wrap(`<p>No sample HTML for template <code>${templateId}</code>.</p>`);
  }
}
