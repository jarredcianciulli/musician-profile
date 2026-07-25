const corsHeaders = (origin) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});

export default {
  async fetch(request, env, ctx) {
    const origin = env.WEBSITE_DOMAIN || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders(origin),
      });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload." }),
        {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    const { name, email, phone, message } = payload || {};

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Name, email, and message are required." }),
        {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    try {
      const brevoBody = {
        sender: { email: env.FROM_EMAIL || env.TO_EMAIL, name: "Jarred Cianciulli" },
        to: [{ email: env.TO_EMAIL || env.FROM_EMAIL, name: "Jarred Cianciulli" }],
        replyTo: { email, name },
        subject: "New Contact Form Submission",
        htmlContent: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br/>")}</p>
        `,
      };

      // Send a confirmation email to user as well
      if (email) {
        brevoBody.to.push({ email, name });
      }

      const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": env.BREVO_API_KEY,
        },
        body: JSON.stringify(brevoBody),
      });

      if (!brevoResponse.ok) {
        const errorText = await brevoResponse.text();
        return new Response(
          JSON.stringify({
            error: "Failed to send email via Brevo.",
            details: errorText,
          }),
          {
            status: 502,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Unexpected error sending email.",
          details: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }
  },
};




