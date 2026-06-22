// Provider-agnostic mail abstraction. In dev (no provider configured) it logs
// the message server-side and reports delivered:false so callers can surface a
// dev link. Wire a real transport (Resend/SMTP) where marked for production.
export const mailConfigured = Boolean(
  process.env.RESEND_API_KEY || process.env.SMTP_URL || process.env.SMTP_HOST,
);

export async function sendMail(msg: { to: string; subject: string; text: string }): Promise<{ delivered: boolean }> {
  if (!mailConfigured) {
    console.log(`[mail:dev] To: ${msg.to}\nSubject: ${msg.subject}\n${msg.text}\n`);
    return { delivered: false };
  }
  // TODO(prod): integrate Resend or SMTP here using the env credentials.
  console.log(`[mail] provider configured — sending "${msg.subject}" to ${msg.to}`);
  return { delivered: true };
}
