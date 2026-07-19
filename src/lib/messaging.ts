/** Normalise a Nigerian phone number to international format (234XXXXXXXXXX). */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "234" + digits.slice(1);
  if (digits.length === 10) return "234" + digits;
  return null;
}

/**
 * Send voter credentials via Infobip WhatsApp using the "authentication" template.
 *
 * Template structure (1 body placeholder + URL button + Quick Reply button):
 *   Body {{1}} → "Voter ID: XXXX | Password: YYYY"
 *
 * Required env vars:
 *   INFOBIP_API_KEY   – from Infobip portal
 *   INFOBIP_BASE_URL  – e.g. 8vmrkr.api.infobip.com
 *   INFOBIP_SENDER    – WhatsApp sender number (test: 447860088970)
 */
export async function sendVoterCredentials({
  phone,
  name: _name,
  voterId,
  password,
}: {
  phone: string;
  name: string;
  voterId: string;
  password: string;
}): Promise<boolean> {
  const apiKey = process.env.INFOBIP_API_KEY;
  const baseUrl = process.env.INFOBIP_BASE_URL ?? "8vmrkr.api.infobip.com";
  const from = process.env.INFOBIP_SENDER ?? "447860088970";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nse-evoting.vercel.app";

  if (!apiKey) return false;

  const to = normalizePhone(phone);
  if (!to) return false;

  const code = `Voter ID: ${voterId} | Password: ${password}`;

  try {
    const res = await fetch(`https://${baseUrl}/whatsapp/1/message/template`, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            from,
            to,
            content: {
              templateName: "authentication",
              templateData: {
                body: {
                  placeholders: [code],
                },
                buttons: [
                  { type: "URL", parameter: appUrl },
                  { type: "QUICK_REPLY", parameter: "noted" },
                ],
              },
              language: "en",
            },
          },
        ],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
