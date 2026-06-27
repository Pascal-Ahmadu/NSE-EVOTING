const TERMII_API = "https://v3.api.termii.com/api/sms/send";

/** Normalise a Nigerian phone number to Termii's expected format (234XXXXXXXXXX). */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "234" + digits.slice(1);
  if (digits.length === 10) return "234" + digits;
  return null;
}

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
  if (!apiKey) return false;

  const to = normalizePhone(phone);
  if (!to) return false;

  const senderId = process.env.TERMII_SENDER_ID ?? "NSEvoting";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nse-evoting.vercel.app";

  const sms =
    `Hello ${name},\n\nYour NSE e-voting credentials:\n` +
    `Voter ID: ${voterId}\n` +
    `Password: ${password}\n\n` +
    `Vote at: ${appUrl}\n\n` +
    `Do not share these credentials.`;

  try {
    const res = await fetch(TERMII_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        from: senderId,
        sms,
        type: "unicode",
        channel: "whatsapp",
        api_key: apiKey,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
