import "server-only";

/**
 * Email delivery via Resend, with a dev fallback that logs the message (and any
 * link) to the server console so magic-link / invitation flows are testable
 * with no API key. Used by auth (magic links, invites) and reminders (§7/§8).
 */

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: EmailInput): Promise<{ ok: boolean; dev?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Uruz <ravne@uruz.local>";

  if (!apiKey) {
    // Dev fallback — surface the content so the flow can be completed locally.
    console.log("\n📧 [dev email — no RESEND_API_KEY]");
    console.log(`   To:      ${input.to}`);
    console.log(`   Subject: ${input.subject}`);
    if (input.text) console.log(`   Text:    ${input.text}`);
    console.log("");
    return { ok: true, dev: true };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true };
  } catch (err) {
    console.error("sendEmail failed:", err);
    return { ok: false };
  }
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
