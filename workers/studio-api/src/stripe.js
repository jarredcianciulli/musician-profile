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
    `/checkout/sessions/${encodeURIComponent(sessionId)}`
  );
}

export async function createTrialCheckoutSession(env, {
  bookingId,
  email,
  name,
  successUrl,
  cancelUrl,
  metadata = {},
}) {
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
          unit_amount: 3500,
          product_data: {
            name: "Battery String Studio — Trial lesson",
            description: "30-minute violin/viola trial ($35)",
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
  metadata = {},
}) {
  const line_items = [];

  if (prorateCents > 0) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: prorateCents,
        product_data: {
          name: `First-month proration (${durationMinutes} min lessons)`,
          description: "Remaining lessons in the current month",
        },
      },
    });
  }

  if (priceId) {
    line_items.push({ quantity: 1, price: priceId });
  } else {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: monthlyRateCents,
        recurring: { interval: "month" },
        product_data: {
          name: `Weekly ${durationMinutes}-min lessons`,
          description: "Monthly subscription — Battery String Studio",
        },
      },
    });
  }

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
  };

  // Mid-month: charge one-time proration now, first recurring invoice at next
  // month. Do NOT set billing_cycle_anchor + proration_behavior=none — Stripe
  // rejects that combo when line_items include a one-time price.
  if (billingCycleAnchor) {
    body.subscription_data.trial_end = billingCycleAnchor;
  }

  return stripeRequest(env, "POST", "/checkout/sessions", body);
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
