/** Normalise a Nigerian phone number to international format (234XXXXXXXXXX). */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "234" + digits.slice(1);
  if (digits.length === 10) return "234" + digits;
  return null;
}

/**
 * Send voter credentials via Infobip WhatsApp template message.
 *
 * Required env vars:
 *   INFOBIP_API_KEY       – from Infobip dashboard
 *   INFOBIP_BASE_URL      – your Infobip base URL (e.g. 8vmrkr.api.infobip.com)
 *   INFOBIP_SENDER        – approved WhatsApp sender number (e.g. 447860088970)
 *   INFOBIP_TEMPLATE_NAME – approved template name with 4 placeholders:
 *                           {{1}} name  {{2}} voterId  {{3}} password  {{4}} url
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
  const apiKey = process.env.INFOBIP_API_KEY;
  const baseUrl = process.env.INFOBIP_BASE_URL ?? "8vmrkr.api.infobip.com";
  const from = process.env.INFOBIP_SENDER ?? "447860088970";
  const templateName = process.env.INFOBIP_TEMPLATE_NAME ?? "nse_voter_credentials";

  if (!apiKey) return false;

  const to = normalizePhone(phone);
  if (!to) return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nse-evoting.vercel.app";

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
              templateName,
              templateData: {
                body: {
                  placeholders: [name, voterId, password, appUrl],
                },
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
