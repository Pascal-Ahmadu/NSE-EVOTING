/** Normalise a Nigerian phone number to Termii's international format (234XXXXXXXXXX). */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "234" + digits.slice(1);
  if (digits.length === 10) return "234" + digits;
  return null;
}

/**
 * Send voter credentials via a pre-approved Termii WhatsApp template.
 *
 * Required env vars:
 *   TERMII_API_KEY      – from Termii dashboard
 *   TERMII_DEVICE_ID    – WhatsApp Device ID from Termii dashboard
 *   TERMII_TEMPLATE_ID  – ID of the approved template
 *
 * Expected template variable mapping (set up the template in Termii to match):
 *   {{1}} = voter name
 *   {{2}} = voter ID
 *   {{3}} = password
 *   {{4}} = voting URL
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
  const deviceId = process.env.TERMII_DEVICE_ID;
  const templateId = process.env.TERMII_TEMPLATE_ID;

  if (!apiKey || !deviceId || !templateId) return false;

  const to = normalizePhone(phone);
  if (!to) return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nse-evoting.vercel.app";

  try {
    const res = await fetch("https://v3.api.termii.com/api/send/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: to,
        device_id: deviceId,
        template_id: templateId,
        api_key: apiKey,
        data: {
          "1": name,
          "2": voterId,
          "3": password,
          "4": appUrl,
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
