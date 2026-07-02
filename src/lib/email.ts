import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingConfirmationEmail(params: {
  to: string;
  guestName: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
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
          <tr><td style="padding:6px 0; color:#6b6b6b;">Room</td><td style="text-align:right;">${params.roomTypeName}</td></tr>
          <tr><td style="padding:6px 0; color:#6b6b6b;">Check-in</td><td style="text-align:right;">${params.checkIn}</td></tr>
          <tr><td style="padding:6px 0; color:#6b6b6b;">Check-out</td><td style="text-align:right;">${params.checkOut}</td></tr>
          <tr><td style="padding:6px 0; color:#6b6b6b;">Total paid</td><td style="text-align:right;"><strong>${params.currency} ${params.totalAmount.toLocaleString()}</strong></td></tr>
          <tr><td style="padding:6px 0; color:#6b6b6b;">Confirmation #</td><td style="text-align:right;">${params.bookingId.slice(0, 8).toUpperCase()}</td></tr>
        </table>
        <p style="color:#6b6b6b; font-size:13px;">If anything about your stay needs adjusting, just reply to this email or call us.</p>
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
