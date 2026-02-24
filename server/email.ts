/**
 * Phase 11F — Purchase Confirmation Email
 *
 * Sends a receipt-style confirmation email to the user after a successful
 * credit purchase. Uses Resend as the email transport.
 *
 * Design rules:
 * - If RESEND_API_KEY is missing, skip send and log a warning (no crash).
 * - Caller is responsible for idempotency (checking emailSentAt before calling).
 * - Returns { sent: true } on success, { sent: false, error } on failure.
 */
import { Resend } from "resend";
import { ENV } from "./_core/env";

export type PurchaseEmailPayload = {
  toEmail: string;
  receiptId: number;
  packId: string;
  creditsAdded: number;
  amountCents: number | null | undefined;
  currency: string | null | undefined;
  purchasedAt: Date;
  stripeCheckoutSessionId: string;
  newBalance: number;
};

export type SendEmailResult =
  | { sent: true }
  | { sent: false; error: string };

/**
 * Format a currency amount from cents to a human-readable string.
 * e.g. 999, "usd" → "$9.99"
 */
function formatAmount(cents: number | null | undefined, currency: string | null | undefined): string {
  if (!cents || !currency) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/**
 * Format a pack ID to a human-readable name.
 * e.g. "starter" → "Starter Pack"
 */
function formatPackName(packId: string): string {
  const names: Record<string, string> = {
    starter: "Starter Pack (5 credits)",
    pro: "Pro Pack (15 credits)",
    power: "Power Pack (50 credits)",
  };
  return names[packId] ?? `${packId.charAt(0).toUpperCase()}${packId.slice(1)} Pack`;
}

/**
 * Build the HTML body for the purchase confirmation email.
 */
export function buildPurchaseEmailHtml(payload: PurchaseEmailPayload): string {
  const {
    receiptId,
    packId,
    creditsAdded,
    amountCents,
    currency,
    purchasedAt,
    stripeCheckoutSessionId,
    newBalance,
  } = payload;

  const amountStr = formatAmount(amountCents, currency);
  const packName = formatPackName(packId);
  const dateStr = purchasedAt.toUTCString();
  const shortRef = stripeCheckoutSessionId.slice(-12).toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Resupify Credit Purchase Receipt</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#16a34a;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Resupify</h1>
              <p style="margin:4px 0 0;color:#bbf7d0;font-size:14px;">Credit Purchase Confirmation</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px;color:#374151;font-size:16px;">
                Thank you for your purchase! Your credits have been added to your account.
              </p>
              <!-- Receipt table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Item</td>
                  <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:right;">Detail</td>
                </tr>
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:12px 16px;color:#374151;font-size:14px;">Pack</td>
                  <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:500;text-align:right;">${packName}</td>
                </tr>
                <tr style="border-top:1px solid #e5e7eb;background:#f9fafb;">
                  <td style="padding:12px 16px;color:#374151;font-size:14px;">Credits Added</td>
                  <td style="padding:12px 16px;color:#16a34a;font-size:14px;font-weight:700;text-align:right;">+${creditsAdded} credits</td>
                </tr>
                ${amountStr ? `
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:12px 16px;color:#374151;font-size:14px;">Amount Charged</td>
                  <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:500;text-align:right;">${amountStr}</td>
                </tr>` : ""}
                <tr style="border-top:1px solid #e5e7eb;background:#f9fafb;">
                  <td style="padding:12px 16px;color:#374151;font-size:14px;">New Credit Balance</td>
                  <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:700;text-align:right;">${newBalance} credits</td>
                </tr>
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:12px 16px;color:#374151;font-size:14px;">Purchase Date</td>
                  <td style="padding:12px 16px;color:#111827;font-size:14px;text-align:right;">${dateStr}</td>
                </tr>
                <tr style="border-top:1px solid #e5e7eb;background:#f9fafb;">
                  <td style="padding:12px 16px;color:#374151;font-size:14px;">Reference</td>
                  <td style="padding:12px 16px;color:#6b7280;font-size:13px;font-family:monospace;text-align:right;">REC-${receiptId} / …${shortRef}</td>
                </tr>
              </table>
              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="https://resupify.com/billing"
                       style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600;">
                      View Billing &amp; Credits
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                Questions about this purchase? Review our
                <a href="https://resupify.com/refund-policy" style="color:#16a34a;text-decoration:none;">refund policy</a>
                or contact us at
                <a href="mailto:support@resupify.com" style="color:#16a34a;text-decoration:none;">support@resupify.com</a>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                © ${new Date().getFullYear()} Resupify · This email was sent because you made a purchase on resupify.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build the plain-text fallback for the purchase confirmation email.
 */
export function buildPurchaseEmailText(payload: PurchaseEmailPayload): string {
  const { receiptId, packId, creditsAdded, amountCents, currency, purchasedAt, stripeCheckoutSessionId, newBalance } = payload;
  const amountStr = formatAmount(amountCents, currency);
  const packName = formatPackName(packId);
  const shortRef = stripeCheckoutSessionId.slice(-12).toUpperCase();

  return [
    "RESUPIFY — CREDIT PURCHASE CONFIRMATION",
    "========================================",
    "",
    "Thank you for your purchase! Your credits have been added to your account.",
    "",
    `Pack:            ${packName}`,
    `Credits Added:   +${creditsAdded} credits`,
    amountStr ? `Amount Charged:  ${amountStr}` : "",
    `New Balance:     ${newBalance} credits`,
    `Purchase Date:   ${purchasedAt.toUTCString()}`,
    `Reference:       REC-${receiptId} / ...${shortRef}`,
    "",
    "View your billing page: https://resupify.com/billing",
    "",
    "Questions? See our refund policy: https://resupify.com/refund-policy",
    "Or contact us: support@resupify.com",
  ].filter(line => line !== null).join("\n");
}

/**
 * Send a purchase confirmation email via Resend.
 *
 * Returns { sent: true } on success.
 * Returns { sent: false, error } if RESEND_API_KEY is missing or the send fails.
 * Never throws — callers should not fail the webhook on email errors.
 */
export async function sendPurchaseConfirmationEmail(
  payload: PurchaseEmailPayload
): Promise<SendEmailResult> {
  if (!ENV.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured — skipping purchase confirmation email");
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const resend = new Resend(ENV.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: `Resupify <${ENV.FROM_EMAIL}>`,
      to: [payload.toEmail],
      subject: "Your Resupify credit purchase receipt",
      html: buildPurchaseEmailHtml(payload),
      text: buildPurchaseEmailText(payload),
    });

    if (error) {
      const msg = typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : JSON.stringify(error);
      console.error("[Email] Resend error:", msg);
      return { sent: false, error: msg };
    }

    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Email] Unexpected error sending purchase confirmation:", msg);
    return { sent: false, error: msg };
  }
}
