import { config } from "./config";

// Provider-agnostic mail abstraction. Sends via Resend when RESEND_API_KEY is set
// (zero-dep — uses fetch); otherwise (dev) it logs the message and reports
// delivered:false so callers can surface a dev link.
export const mailConfigured = Boolean(config.mail.resendApiKey);

// Apply a per-agency display name to the configured "from" address (white-label
// email branding): "Acme Home Care <onboarding@resend.dev>".
function withDisplayName(from: string, name?: string): string {
  if (!name) return from;
  const m = /<([^>]+)>/.exec(from);
  const email = m ? m[1] : from;
  return `${name} <${email}>`;
}

export async function sendMail(msg: {
  to: string; subject: string; text: string; fromName?: string;
}): Promise<{ delivered: boolean }> {
  const apiKey = config.mail.resendApiKey;
  if (!apiKey) {
    console.log(`[mail:dev] To: ${msg.to}\nSubject: ${msg.subject}\n${msg.text}\n`);
    return { delivered: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: withDisplayName(config.mail.from, msg.fromName),
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
      }),
    });
    if (res.ok) return { delivered: true };
    console.error(`[mail:resend] ${res.status} ${await res.text().catch(() => "")}`);
    return { delivered: false };
  } catch (e) {
    console.error("[mail:resend] send failed", e);
    return { delivered: false };
  }
}
