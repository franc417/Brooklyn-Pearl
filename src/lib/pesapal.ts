/**
 * Pesapal API v3 integration.
 *
 * Pesapal's hosted payment page (the redirect_url returned from
 * submitOrder) offers Visa/Mastercard AND M-Pesa AND Airtel Money as
 * payment options to the guest automatically — this one integration covers
 * both payment methods the resort wants, no separate Safaricom Daraja
 * integration required.
 *
 * Flow:
 *   1. getAuthToken()      — bearer token, valid ~5 minutes
 *   2. registerIpnUrl()    — ONE-TIME setup, see README. Save the returned
 *                            ipn_id as PESAPAL_IPN_ID in your env vars.
 *   3. submitOrder()       — called from /api/bookings when a guest books.
 *                            Returns a redirect_url — send the guest there.
 *   4. Pesapal calls our IPN endpoint server-to-server when payment status
 *      changes. That handler calls getTransactionStatus() to confirm before
 *      trusting anything (the IPN ping itself carries no status — it's just
 *      a "go check now" signal, by Pesapal's design).
 */

const BASE_URL =
  process.env.PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3/api"
    : "https://cybqa.pesapal.com/pesapalv3/api";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAuthToken(): Promise<string> {
  // Reuse a cached token if it still has >30s of life left — avoids hammering
  // the auth endpoint on every request, since tokens are only valid 5 minutes.
  if (cachedToken && cachedToken.expiresAt - Date.now() > 30_000) {
    return cachedToken.token;
  }

  const res = await fetch(`${BASE_URL}/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Pesapal auth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  if (!data.token) {
    throw new Error(`Pesapal auth returned no token: ${JSON.stringify(data)}`);
  }

  cachedToken = { token: data.token, expiresAt: Date.now() + 4.5 * 60 * 1000 };
  return data.token;
}

/**
 * One-time setup — run this once (e.g. via a scratch script or `curl`) after
 * deploying, then hardcode the returned ipn_id as PESAPAL_IPN_ID. You do not
 * need to call this on every request.
 */
export async function registerIpnUrl(ipnUrl: string) {
  const token = await getAuthToken();
  const res = await fetch(`${BASE_URL}/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: "GET" }),
  });
  return res.json(); // contains ipn_id
}

export interface SubmitOrderParams {
  merchantReference: string; // our own booking id
  amount: number;
  currency: "KES" | "USD";
  description: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
}

export interface SubmitOrderResult {
  order_tracking_id: string;
  redirect_url: string;
  merchant_reference: string;
  error?: { error_type: string; code: string; message: string } | null;
  status: string;
}

export async function submitOrder(params: SubmitOrderParams): Promise<SubmitOrderResult> {
  const token = await getAuthToken();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const res = await fetch(`${BASE_URL}/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: params.merchantReference,
      currency: params.currency,
      amount: params.amount,
      description: params.description,
      callback_url: `${siteUrl}/booking/confirmation`,
      notification_id: process.env.PESAPAL_IPN_ID,
      billing_address: {
        email_address: params.email,
        phone_number: params.phone,
        first_name: params.firstName,
        last_name: params.lastName,
        country_code: "KE",
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Pesapal submitOrder failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export interface TransactionStatusResult {
  payment_method: string; // e.g. "Visa", "Mpesa"
  amount: number;
  created_date: string;
  confirmation_code: string;
  payment_status_description: "Completed" | "Failed" | "Invalid" | "Pending" | string;
  status_code: number;
  merchant_reference: string;
  currency: string;
}

export async function getTransactionStatus(
  orderTrackingId: string
): Promise<TransactionStatusResult> {
  const token = await getAuthToken();
  const res = await fetch(
    `${BASE_URL}/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Pesapal getTransactionStatus failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export interface RefundResult {
  status: string; // "200" on success
  message: string;
}

/**
 * Real limitations enforced by Pesapal itself (not just documented here —
 * they will reject the request if violated):
 *   - only payments with status COMPLETED can be refunded
 *   - can't refund more than was originally collected
 *   - card payments can be partially refunded; mobile money (M-Pesa) can
 *     only be refunded IN FULL
 *   - only ONE refund is allowed per payment, ever — there's no retry if
 *     the first request used the wrong amount
 * Identified by confirmation_code, NOT the order_tracking_id used
 * everywhere else in this file — see payments.confirmation_code, populated
 * in api/payments/pesapal/callback/route.ts when a payment completes.
 */
export async function requestRefund(params: {
  confirmationCode: string;
  amount: number;
  remarks: string;
  username: string;
}): Promise<RefundResult> {
  const token = await getAuthToken();
  const res = await fetch(`${BASE_URL}/Transactions/RefundRequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      confirmation_code: params.confirmationCode,
      amount: params.amount,
      username: params.username,
      remarks: params.remarks,
    }),
  });

  if (!res.ok) {
    throw new Error(`Pesapal refund request failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
