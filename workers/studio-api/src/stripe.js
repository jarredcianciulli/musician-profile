/**
 * Minimal Stripe REST helpers for Cloudflare Workers (no SDK).
 */

function stripeHeaders(secretKey) {
  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

function encodeForm(data, prefix = "") {
  const parts = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object" && !Array.isArray(value)) {
      parts.push(encodeForm(value, fullKey));
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object") {
          parts.push(encodeForm(item, `${fullKey}[${i}]`));
        } else {
          parts.push(
            `${encodeURIComponent(`${fullKey}[${i}]`)}=${encodeURIComponent(
              String(item)
            )}`
          );
        }
      });
    } else {
      parts.push(
        `${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`
      );
    }
  }
  return parts.filter(Boolean).join("&");
}

export async function stripeRequest(env, method, path, body) {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: stripeHeaders(key),
    body: body ? encodeForm(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || "Stripe request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.stripe = data;
    throw err;
  }
  return data;
}

export async function retrieveCheckoutSession(env, sessionId) {
  return stripeRequest(
    env,
    "GET",
    `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`
  );
}

/** Expire an open Checkout Session so the old amount can no longer be paid. */
export async function expireCheckoutSession(env, sessionId) {
  if (!sessionId) return null;
  try {
    return await stripeRequest(
      env,
      "POST",
      `/checkout/sessions/${encodeURIComponent(sessionId)}/expire`
    );
  } catch (err) {
    // Already complete/expired — fine to ignore
    console.error("expireCheckoutSession:", err?.message || err);
    return null;
  }
}

export async function createTrialCheckoutSession(env, {
  bookingId,
  email,
  name,
  successUrl,
  cancelUrl,
  /** Cents — default $35 public trial */
  amountCents = 3500,
  durationMinutes = 30,
  metadata = {},
}) {
  const cents = Math.max(0, Math.round(Number(amountCents) || 0));
  if (cents <= 0) {
    throw new Error("Trial Checkout amount must be greater than 0.");
  }
  const dollars = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  const mins = durationMinutes || 30;
  return stripeRequest(env, "POST", "/checkout/sessions", {
    mode: "payment",
    customer_email: email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: bookingId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: cents,
          product_data: {
            name: "Battery String Studio — Trial lesson",
            description: `${mins}-minute violin/viola trial ($${dollars})`,
          },
        },
      },
    ],
    metadata: {
      bookingId,
      name,
      type: "trial",
      ...metadata,
    },
  });
}

/** e.g. "November 1, 2026" in studio TZ — for Checkout product copy. */
function formatBillingStartLabel(isoOrUnix) {
  let d;
  if (typeof isoOrUnix === "number" && Number.isFinite(isoOrUnix)) {
    d = new Date(isoOrUnix * 1000);
  } else if (typeof isoOrUnix === "string" && isoOrUnix) {
    d = new Date(isoOrUnix);
  } else {
    return "";
  }
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

export async function createSubscriptionCheckoutSession(env, {
  email,
  name,
  durationMinutes,
  monthlyRateCents,
  prorateCents,
  priceId,
  successUrl,
  cancelUrl,
  billingCycleAnchor,
  remainingLessons,
  nextCycleStartIso,
  metadata = {},
}) {
  const line_items = [];
  const lessonCount =
    typeof remainingLessons === "number" &&
    Number.isFinite(remainingLessons) &&
    remainingLessons > 0
      ? Math.round(remainingLessons)
      : null;
  const nextBillLabel = formatBillingStartLabel(
    nextCycleStartIso || billingCycleAnchor
  );
  const monthlyDollars = ((monthlyRateCents || 0) / 100).toFixed(
    (monthlyRateCents || 0) % 100 === 0 ? 0 : 2
  );

  if (prorateCents > 0) {
    const lessonBit = lessonCount
      ? `${lessonCount} remaining lesson${lessonCount === 1 ? "" : "s"} this month`
      : "Remaining lessons this month";
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: prorateCents,
        product_data: {
          name: `Due today — ${lessonBit}`,
          description: nextBillLabel
            ? `Covers lessons until ${nextBillLabel}, when $${monthlyDollars}/mo billing begins on the 1st.`
            : "Partial first month. Monthly tuition then bills on the 1st.",
        },
      },
    });
  }

  // When the first monthly charge is delayed to the 1st, use inline price_data
  // so Checkout can say “bills on the 1st” (Dashboard Price copy cannot).
  // Stripe still may show “X days free” for that delay — custom_text clarifies.
  const delayFirstInvoice = Boolean(billingCycleAnchor);
  if (priceId && !delayFirstInvoice) {
    line_items.push({ quantity: 1, price: priceId });
  } else {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: monthlyRateCents,
        recurring: { interval: "month" },
        product_data: {
          name: `Weekly ${durationMinutes}-min lessons — $${monthlyDollars}/mo`,
          description: nextBillLabel
            ? `First charge ${nextBillLabel}, then on the 1st each month. Not a free trial — today you only pay the partial month above.`
            : "Billed on the 1st of each month. Not a free trial.",
        },
      },
    });
  }

  const submitMessage =
    prorateCents > 0 && nextBillLabel
      ? `Today you pay only for remaining lessons this month. Stripe may show a short “free” period — that is the wait until ${nextBillLabel}, when $${monthlyDollars}/month tuition starts (billed on the 1st). Not a free trial.`
      : prorateCents > 0
        ? "Today you pay for remaining lessons this month. Monthly tuition then bills on the 1st — not a free trial."
        : "Monthly subscription for your weekly lesson spot, billed on the 1st.";

  const body = {
    mode: "subscription",
    customer_email: email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items,
    metadata: {
      name,
      type: "subscription",
      durationMinutes: String(durationMinutes),
      ...metadata,
    },
    subscription_data: {
      metadata: {
        name,
        durationMinutes: String(durationMinutes),
        ...metadata,
      },
    },
    custom_text: {
      submit: {
        message: submitMessage,
      },
    },
  };

  // Mid-month: charge one-time proration now; first recurring invoice on the 1st.
  // Stripe only allows this delay via trial_end when a one-time line item is
  // present (billing_cycle_anchor + one-time is rejected). Not a free trial —
  // Checkout may still label the wait as “X days free.”
  if (billingCycleAnchor) {
    body.subscription_data.trial_end = billingCycleAnchor;
  }

  return stripeRequest(env, "POST", "/checkout/sessions", body);
}

/** One-time Checkout for mid-month proration (manual billing path). */
export async function createProrationPaymentSession(env, {
  email,
  name,
  durationMinutes,
  prorateCents,
  successUrl,
  cancelUrl,
  metadata = {},
}) {
  if (!prorateCents || prorateCents <= 0) {
    throw new Error("Nothing to charge for the partial month.");
  }
  return stripeRequest(env, "POST", "/checkout/sessions", {
    mode: "payment",
    customer_email: email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: prorateCents,
          product_data: {
            name: `Lesson tuition (${durationMinutes} min)`,
            description: "Period payment — Battery String Studio",
          },
        },
      },
    ],
    metadata: {
      name,
      type: "manual_proration",
      durationMinutes: String(durationMinutes),
      ...metadata,
    },
  });
}

/**
 * Reusable Payment Link for monthly tuition (manual billing).
 * Uses STRIPE_PRICE_{mins} when set; otherwise creates a one-off Price.
 */
export async function createMonthlyPaymentLink(env, {
  durationMinutes,
  monthlyRateCents,
  priceId,
}) {
  let price = priceId || "";
  if (!price) {
    const created = await stripeRequest(env, "POST", "/prices", {
      currency: "usd",
      unit_amount: monthlyRateCents,
      product_data: {
        name: `Weekly ${durationMinutes}-min lessons (monthly tuition)`,
      },
    });
    price = created.id;
  }
  const link = await stripeRequest(env, "POST", "/payment_links", {
    line_items: [{ price, quantity: 1 }],
  });
  return { url: link.url, id: link.id, priceId: price };
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Verify Stripe-Signature header. */
export async function verifyStripeWebhook(rawBody, signatureHeader, secret) {
  if (!secret || !signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v];
    })
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (age > 300) return false;
  const expected = await hmacSha256Hex(secret, `${t}.${rawBody}`);
  return timingSafeEqual(expected, v1);
}
