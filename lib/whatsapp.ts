import twilio from "twilio";

let cachedClient: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (cachedClient) return cachedClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  cachedClient = twilio(sid, token);
  return cachedClient;
}

function getFrom(): string | null {
  return process.env.TWILIO_WHATSAPP_FROM ?? null;
}

/** Ensure the recipient address is in `whatsapp:+E164` form. */
function normalizeTo(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("whatsapp:")) return trimmed;
  if (trimmed.startsWith("+")) return `whatsapp:${trimmed}`;
  if (/^\d+$/.test(trimmed)) return `whatsapp:+${trimmed}`;
  return null;
}

export interface WhatsappRecipient {
  to: string;
  body: string;
}

export interface WhatsappResult {
  sent: number;
  failed: { to: string; error: string }[];
}

export async function sendBulkWhatsapp(
  recipients: WhatsappRecipient[]
): Promise<WhatsappResult> {
  const out: WhatsappResult = { sent: 0, failed: [] };
  if (recipients.length === 0) return out;

  const client = getClient();
  const from = getFrom();
  if (!client || !from) {
    console.log(
      `\n[WHATSAPP - DEV] missing TWILIO_ACCOUNT_SID/AUTH_TOKEN/WHATSAPP_FROM, would send to ${recipients.length} recipients`
    );
    out.sent = recipients.length;
    return out;
  }

  const CONCURRENCY = 5;
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= recipients.length) return;
      const r = recipients[i];
      const to = normalizeTo(r.to);
      if (!to) {
        out.failed.push({ to: r.to, error: "Invalid phone number" });
        continue;
      }
      try {
        await client!.messages.create({ from: from!, to, body: r.body });
        out.sent += 1;
      } catch (err) {
        out.failed.push({
          to: r.to,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, recipients.length) }, worker));
  return out;
}
