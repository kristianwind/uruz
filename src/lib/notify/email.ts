import "server-only";

/**
 * Email delivery, used by auth (magic links, invites) and reminders (§7/§8).
 *
 * Three ways out, chosen by what is configured:
 *
 * 1. **SMTP** — any mail server: a company's own, a mailbox at one's hosting
 *    provider, Gmail with an app password. This is what a self-hosted
 *    installation usually already has, and it needs no account anywhere new.
 * 2. **Resend** — an API key, no server to run.
 * 3. **Neither** — the message is written to the server log, links and all, so
 *    the sign-in and invitation flows can be completed locally with nothing
 *    configured at all.
 *
 * SMTP wins when both are set: someone who went to the trouble of entering a
 * mail server meant it.
 */

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type EmailProvider = "smtp" | "resend" | "dev";

/** Which way out is actually configured — shown in the admin panel. */
export function emailProvider(): EmailProvider {
  if (process.env.SMTP_HOST?.trim()) return "smtp";
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  return "dev";
}

const DEFAULT_FROM = "Uruz <ravne@uruz.local>";

export async function sendEmail(input: EmailInput): Promise<{ ok: boolean; dev?: boolean }> {
  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;

  switch (emailProvider()) {
    case "smtp":
      return sendViaSmtp(input, from);
    case "resend":
      return sendViaResend(input, from);
    default:
      return logToConsole(input);
  }
}

async function sendViaSmtp(input: EmailInput, from: string): Promise<{ ok: boolean }> {
  try {
    const { createTransport } = await import("nodemailer");
    // Port 465 is implicit TLS; 587 and 25 start plaintext and upgrade with
    // STARTTLS. Getting this backwards is the usual reason a send hangs, so
    // derive it from the port and let SMTP_SECURE override for odd setups.
    const port = Number(process.env.SMTP_PORT) || 587;
    const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
    const secure = secureEnv ? secureEnv === "true" || secureEnv === "1" : port === 465;

    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS;

    const transport = createTransport({
      host: process.env.SMTP_HOST!.trim(),
      port,
      secure,
      // An unauthenticated relay is a legitimate setup on a private network.
      auth: user ? { user, pass } : undefined,
    });

    await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true };
  } catch (err) {
    // Never rethrow: a failed invitation e-mail must not take down the request
    // that created the invitation — the link is shown in the UI regardless.
    console.error("sendEmail (smtp) failed:", err);
    return { ok: false };
  }
}

async function sendViaResend(input: EmailInput, from: string): Promise<{ ok: boolean }> {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true };
  } catch (err) {
    console.error("sendEmail (resend) failed:", err);
    return { ok: false };
  }
}

function logToConsole(input: EmailInput): { ok: boolean; dev: boolean } {
  console.log("\n📧 [dev email — no SMTP_HOST and no RESEND_API_KEY]");
  console.log(`   To:      ${input.to}`);
  console.log(`   Subject: ${input.subject}`);
  if (input.text) console.log(`   Text:    ${input.text}`);
  console.log("");
  return { ok: true, dev: true };
}

export function magicLinkEmail(link: string): { subject: string; html: string; text: string } {
  return {
    subject: "Dit login-link til Uruz ᚢ",
    text: `Log ind i Uruz: ${link}\n\nLinket udløber om 30 minutter.`,
    html: `<div style="font-family:sans-serif;max-width:480px">
      <h1 style="color:#e0a83e">Uruz ᚢ</h1>
      <p>Tryk for at logge ind:</p>
      <p><a href="${link}" style="display:inline-block;background:#e0a83e;color:#17130a;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Log ind</a></p>
      <p style="color:#888;font-size:13px">Linket udløber om 30 minutter. Bad du ikke om det, kan du ignorere denne mail.</p>
    </div>`,
  };
}

export function passwordResetEmail(link: string): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: "Nyt kodeord til Uruz ᚢ",
    text: `Vælg et nyt kodeord til Uruz: ${link}\n\nLinket udløber om 30 minutter. Bad du ikke om det, kan du ignorere denne mail — dit kodeord er uændret.`,
    html: `<div style="font-family:sans-serif;max-width:480px">
      <h1 style="color:#e0a83e">Uruz ᚢ</h1>
      <p>Tryk for at vælge et nyt kodeord:</p>
      <p><a href="${link}" style="display:inline-block;background:#e0a83e;color:#17130a;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Vælg nyt kodeord</a></p>
      <p style="color:#888;font-size:13px">Linket udløber om 30 minutter. Bad du ikke om det, kan du ignorere denne mail — dit kodeord er uændret.</p>
    </div>`,
  };
}

export function inviteEmail(link: string, hallName: string): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: `Du er inviteret til ${hallName} på Uruz ᚢ`,
    text: `Du er inviteret til hallen "${hallName}". Accepter her: ${link}`,
    html: `<div style="font-family:sans-serif;max-width:480px">
      <h1 style="color:#e0a83e">Uruz ᚢ</h1>
      <p>Du er inviteret til <strong>${hallName}</strong>.</p>
      <p><a href="${link}" style="display:inline-block;background:#e0a83e;color:#17130a;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Accepter invitation</a></p>
    </div>`,
  };
}
