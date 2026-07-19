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
 * Uses "test_whatsapp_template_en" (1 body placeholder) in free trial.
 * The single placeholder carries the voter's full credentials.
 *
 * NOTE: Infobip free trial only delivers to the pre-registered test number.
 * Update INFOBIP_TEMPLATE_NAME once a multi-placeholder template is approved.
 *
 * Required env vars:
 *   INFOBIP_API_KEY       – from Infobip portal
 *   INFOBIP_BASE_URL      – e.g. 8vmrkr.api.infobip.com
 *   INFOBIP_SENDER        – WhatsApp sender number (test: 447860088970)
 *   INFOBIP_TEMPLATE_NAME – template name (default: test_whatsapp_template_en)
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
  const templateName = process.env.INFOBIP_TEMPLATE_NAME ?? "test_whatsapp_template_en";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nse-evoting.vercel.app";

  if (!apiKey) return false;

  const to = normalizePhone(phone);
  if (!to) return false;

  // Single placeholder carries all credential info
  const placeholder =
    `${name} — NSE e-voting credentials:\n` +
    `Voter ID: ${voterId}\n` +
    `Password: ${password}\n` +
    `Vote at: ${appUrl}`;

  try {
    const payload = {
      messages: [
        {
          from,
          to,
          content: {
            templateName,
            templateData: {
              body: {
                placeholders: [placeholder],
              },
            },
            language: "en",
          },
        },
      ],
    };

    const res = await fetch(`https://${baseUrl}/whatsapp/1/message/template`, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.error(`[Infobip] WhatsApp send failed — status ${res.status}:`, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Infobip] WhatsApp send error:", err);
    return false;
  }
}
