/**
 * Google Calendar free/busy for Cloudflare Workers (service account JWT).
 *
 * Env (set as Worker secrets):
 *   GOOGLE_CALENDAR_ID          — calendar to query (e.g. primary or ID)
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY          — PEM with \n newlines (or literal newlines)
 *
 * If unset, returns [] and the slot engine falls back to in-app bookings only.
 */

function pemToArrayBuffer(pem) {
  const cleaned = String(pem)
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function base64UrlEncode(data) {
  let bytes;
  if (typeof data === "string") {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = new Uint8Array(data);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(env) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const keyPem = env.GOOGLE_PRIVATE_KEY;
  if (!email || !keyPem) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: email,
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(claim)
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(keyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  const jwt = `${unsigned}.${base64UrlEncode(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    console.error("Google token error", await res.text());
    return null;
  }
  const data = await res.json();
  return data.access_token || null;
}

/**
 * @returns {Promise<Array<{ start: string, end: string }>>}
 */
export async function fetchGoogleBusyIntervals(env, timeMin, timeMax) {
  const calendarId = env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return [];

  try {
    const token = await getAccessToken(env);
    if (!token) return [];

    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: new Date(timeMin).toISOString(),
        timeMax: new Date(timeMax).toISOString(),
        items: [{ id: calendarId }],
      }),
    });

    if (!res.ok) {
      console.error("Google freeBusy error", await res.text());
      return [];
    }

    const data = await res.json();
    const busy = data?.calendars?.[calendarId]?.busy || [];
    return busy.map((b) => ({
      start: b.start,
      end: b.end,
    }));
  } catch (err) {
    console.error("Google freeBusy failed", err);
    return [];
  }
}

export function googleCalendarConfigured(env) {
  return Boolean(
    env.GOOGLE_CALENDAR_ID &&
      env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      env.GOOGLE_PRIVATE_KEY
  );
}
