/** Normalise a Nigerian phone number to Termii's international format (234XXXXXXXXXX). */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "234" + digits.slice(1);
  if (digits.length === 10) return "234" + digits;
  return null;
}

/**
 * Send voter credentials via Termii Direct SMS.
 *
 * Required env vars:
 *   TERMII_API_KEY    – from Termii dashboard
 *   TERMII_SENDER_ID  – approved Sender ID from Termii → IDs (e.g. "NSEvoting")
 */
export async function sendVoterCredentials({
  phone,
  name,
  voterId,
  password,
}: {
  phone: string;
  name: string;
  voterId: string;
  password: string;
}): Promise<boolean> {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID ?? "NSEvoting";

  if (!apiKey) return false;

  const to = normalizePhone(phone);
  if (!to) return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nse-evoting.vercel.app";

  const sms =
    `Hello ${name}, your NSE e-voting credentials:\n` +
    `Voter ID: ${voterId}\n` +
    `Password: ${password}\n` +
    `Vote at: ${appUrl}\n` +
    `Do not share these credentials.`;

  try {
    const res = await fetch("https://v3.api.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        from: senderId,
        sms,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
