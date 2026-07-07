import { createServiceRoleClient } from "@/lib/supabase/server";
import { getTransactionStatus } from "@/lib/pesapal";
import { confirmBookingSource } from "@/lib/bookingConfirmation";
import Link from "next/link";

// Guests land here after paying on Pesapal's hosted page (this is the
// callback_url we passed in submitOrder). We double-check status ourselves
// rather than trusting the query string, since Pesapal deliberately doesn't
// put trustworthy status in the redirect for security reasons — the IPN
// webhook (api/payments/pesapal/callback) is the source of truth and may
// arrive slightly before or after the guest lands on this page, so we also
// re-check live here in case the IPN hasn't landed yet.
export default async function BookingConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ OrderTrackingId?: string }>;
}) {
  const { OrderTrackingId } = await searchParams;

  if (!OrderTrackingId) {
    return (
      <ConfirmationShell
        heading="Something's missing"
        body="We couldn't find your payment reference. If you completed a payment, please contact us with your name and dates so we can confirm manually."
      />
    );
  }

  const supabase = createServiceRoleClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, source_table, source_id, status")
    .eq("provider_reference", OrderTrackingId)
    .maybeSingle();

  if (!payment) {
    return (
      <ConfirmationShell
        heading="Booking not found"
        body="Please contact us directly with your payment reference so we can look into this."
      />
    );
  }

  // If the IPN webhook hasn't confirmed yet, check live rather than make the
  // guest wait or refresh manually.
  if (payment.status === "pending") {
    try {
      const status = await getTransactionStatus(OrderTrackingId);
      if (status.payment_status_description === "Completed") {
        await supabase
          .from("payments")
          .update({ status: "completed", confirmation_code: status.confirmation_code })
          .eq("id", payment.id);
        payment.status = "completed";
      }
    } catch {
      // fall through to pending state below
    }
  }

  if (payment.status === "completed") {
    const confirmation = await confirmBookingSource(supabase, payment.source_table, payment.source_id);
    if (confirmation) {
      return (
        <ConfirmationShell
          heading={`You're all set, ${confirmation.guestFirstName}.`}
          body={`${confirmation.serviceName} · ${confirmation.dateLabel} · ${confirmation.currency} ${confirmation.totalAmount.toLocaleString()} paid. A confirmation email is on its way.`}
          confirmationCode={confirmation.sourceId.slice(0, 8).toUpperCase()}
        />
      );
    }
    // confirmBookingSource returns null if it was already confirmed by an
    // earlier IPN ping — that's success too, just nothing left to transition.
    return (
      <ConfirmationShell
        heading="You're all set."
        body="Your payment was confirmed. Check your email for the full confirmation."
      />
    );
  }

  if (payment.status === "failed") {
    return (
      <ConfirmationShell
        heading="Payment didn't go through"
        body="Your booking wasn't held for this attempt. Please try again, or contact us and we'll help directly."
      />
    );
  }

  return (
    <ConfirmationShell
      heading="Confirming your payment…"
      body="This can take a minute to finalize. Refresh this page shortly, or check your email — we'll send confirmation as soon as it's through."
    />
  );
}

function ConfirmationShell({
  heading,
  body,
  confirmationCode,
}: {
  heading: string;
  body: string;
  confirmationCode?: string;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#292f1a",
        color: "#ffffff",
        fontFamily: "'Montserrat', sans-serif",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <p style={{ letterSpacing: "0.3em", fontSize: "0.65rem", color: "#c4a06e", textTransform: "uppercase", marginBottom: "1rem" }}>
          Brooklyn Pearl Resort
        </p>
        <h1 style={{ fontWeight: 300, fontSize: "2rem", marginBottom: "1rem" }}>{heading}</h1>
        <p style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, marginBottom: "1.5rem" }}>{body}</p>
        {confirmationCode && (
          <p style={{ fontSize: "0.8rem", color: "#c4a06e", letterSpacing: "0.1em" }}>
            Confirmation #{confirmationCode}
          </p>
        )}
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginTop: "2rem",
            padding: "0.8rem 2rem",
            border: "1px solid #a47f50",
            color: "#ffffff",
            textDecoration: "none",
            fontSize: "0.72rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
