import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingConfirmationEmail(params: {
  to: string;
  guestName: string;
  serviceName: string;
  dateLabel: string;
  totalAmount: number;
  currency: string;
  bookingId: string;
}) {
  await resend.emails.send({
    from: process.env.NOTIFICATION_EMAIL_FROM!,
    to: params.to,
    subject: "Your Brooklyn Pearl Resort reservation is confirmed",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#292f1a;">You're confirmed, ${params.guestName}.</h2>
        <p>Thank you for booking with Brooklyn Pearl Resort. Here are your details:</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:6px 0; color:#6b6b6b;">Service</td><td style="text-align:right;">${params.serviceName}</td></tr>
          <tr><td style="padding:6px 0; color:#6b6b6b;">When</td><td style="text-align:right;">${params.dateLabel}</td></tr>
          <tr><td style="padding:6px 0; color:#6b6b6b;">Total paid</td><td style="text-align:right;"><strong>${params.currency} ${params.totalAmount.toLocaleString()}</strong></td></tr>
          <tr><td style="padding:6px 0; color:#6b6b6b;">Confirmation #</td><td style="text-align:right;">${params.bookingId.slice(0, 8).toUpperCase()}</td></tr>
        </table>
        <p style="color:#6b6b6b; font-size:13px;">If anything about your booking needs adjusting, just reply to this email or call us.</p>
      </div>
    `,
  });
}

export async function sendRestaurantReservationEmail(params: {
  to: string;
  guestName: string;
  dateLabel: string;
  partySize: number;
  tableNumber: string;
  reservationId: string;
}) {
  await resend.emails.send({
    from: process.env.NOTIFICATION_EMAIL_FROM!,
    to: params.to,
    subject: "Your table at Brooklyn Pearl Resort is reserved",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#292f1a;">See you soon, ${params.guestName}.</h2>
        <p>Your table is reserved. No payment is needed online — just settle up at the restaurant as usual.</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:6px 0; color:#6b6b6b;">When</td><td style="text-align:right;">${params.dateLabel}</td></tr>
          <tr><td style="padding:6px 0; color:#6b6b6b;">Party size</td><td style="text-align:right;">${params.partySize}</td></tr>
          <tr><td style="padding:6px 0; color:#6b6b6b;">Table</td><td style="text-align:right;">${params.tableNumber}</td></tr>
          <tr><td style="padding:6px 0; color:#6b6b6b;">Confirmation #</td><td style="text-align:right;">${params.reservationId.slice(0, 8).toUpperCase()}</td></tr>
        </table>
        <p style="color:#6b6b6b; font-size:13px;">Need to change your reservation? Just reply to this email or call us.</p>
      </div>
    `,
  });
}

export async function sendStaffEnquiryNotification(params: {
  firstName: string;
  lastName: string;
  email: string;
  enquiryType: string;
  message: string;
}) {
  await resend.emails.send({
    from: process.env.NOTIFICATION_EMAIL_FROM!,
    to: process.env.NOTIFICATION_EMAIL_TO!,
    subject: `New enquiry: ${params.enquiryType.replace("_", " ")} — ${params.firstName} ${params.lastName}`,
    html: `
      <p><strong>From:</strong> ${params.firstName} ${params.lastName} (${params.email})</p>
      <p><strong>Type:</strong> ${params.enquiryType}</p>
      <p><strong>Message:</strong></p>
      <p>${params.message.replace(/\n/g, "<br/>")}</p>
    `,
  });
}
