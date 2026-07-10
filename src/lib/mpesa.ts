/**
 * Direct Safaricom Daraja API integration (M-Pesa Express / STK Push).
 * Separate from Pesapal (lib/pesapal.ts), which remains the path for card
 * payments — see the Phase 8+ commit notes on why both exist.
 *
 * This is fundamentally a different flow from Pesapal: there is no hosted
 * page to redirect to. Instead:
 *   1. initiateStkPush() sends a payment prompt directly to the guest's
 *      phone and returns immediately (before they've entered anything)
 *   2. The guest enters their M-Pesa PIN on their own phone
 *   3. Safaricom calls our callback URL with the result, asynchronously,
 *      usually within 10-30 seconds
 * The client UI has to reflect this — a "check your phone" waiting state
 * that polls for the result, not an instant redirect.
 */

const BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// Safaricom's publicly published sandbox test credentials — safe to
// hardcode as the default since they're not secret and don't move real
// money. Override with real values once you have production credentials.
const SANDBOX_SHORTCODE = "174379";
const SANDBOX_PASSKEY =
  "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 30_000) {
    return cachedToken.token;
  }

  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    throw new Error(`Daraja auth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  // Daraja tokens last ~3599 seconds; refresh a little early to be safe.
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 55 * 60 * 1000 };
  return data.access_token;
}

/** yyyymmddhhiiss in Kenya time (EAT, UTC+3) — Daraja rejects UTC timestamps. */
function eatTimestamp(): string {
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000); // shift to EAT
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    now.getUTCFullYear().toString() +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds())
  );
}

/** Normalizes any reasonable Kenyan phone format to Daraja's required 254XXXXXXXXX. */
export function normalizePhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

export interface StkPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export async function initiateStkPush(params: {
  phone: string;
  amount: number;
  accountReference: string; // max 20 chars — truncated below, Daraja rejects longer
  description: string;
}): Promise<StkPushResult> {
  const token = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE || SANDBOX_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY || SANDBOX_PASSKEY;
  const timestamp = eatTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const phone = normalizePhoneNumber(params.phone);

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(params.amount), // Daraja requires an integer
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/mpesa/callback`,
      AccountReference: params.accountReference.slice(0, 20),
      TransactionDesc: params.description,
    }),
  });

  if (!res.ok) {
    throw new Error(`Daraja STK push failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

// Shape of what Safaricom actually POSTs to CallBackURL — success and
// failure/cancellation look different (CallbackMetadata only on success).
export interface StkCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number; // 0 = success, anything else = failed/cancelled
      ResultDesc: string;
      CallbackMetadata?: {
        Item: { Name: string; Value?: string | number }[];
      };
    };
  };
}

export function parseCallbackMetadata(body: StkCallbackBody) {
  const items = body.Body.stkCallback.CallbackMetadata?.Item ?? [];
  const get = (name: string) => items.find((i) => i.Name === name)?.Value;
  return {
    amount: get("Amount") as number | undefined,
    mpesaReceiptNumber: get("MpesaReceiptNumber") as string | undefined,
    phoneNumber: get("PhoneNumber") as number | undefined,
  };
}
