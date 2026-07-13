import { z } from "zod";

export const availabilityQuerySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkIn must be YYYY-MM-DD"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkOut must be YYYY-MM-DD"),
  guests: z.coerce.number().int().min(1).max(12).default(1),
  roomTypeSlug: z.string().optional(), // omit or "any" to search all room types
  category: z.enum(["hotel", "bnb"]).optional(), // omit to search both
});

export const createBookingSchema = z
  .object({
    roomTypeId: z.string().uuid(),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guests: z.coerce.number().int().min(1).max(12),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email(),
    phone: z.string().trim().min(7).max(20),
    specialRequests: z.string().trim().max(1000).optional(),
    paymentMethod: z.enum(["card", "mpesa"]).default("card"),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "checkOut must be after checkIn",
    path: ["checkOut"],
  });

export const enquirySchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  enquiryType: z.enum(["room_reservation", "dining_reservation", "event_wedding", "general"]),
  message: z.string().trim().min(1).max(2000),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type EnquiryInput = z.infer<typeof enquirySchema>;

// ─── Swimming ────────────────────────────────────────────────────────────

export const swimmingAvailabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  partySize: z.coerce.number().int().min(1).max(30).default(1),
});

export const createSwimmingBookingSchema = z.object({
  sessionId: z.string().uuid(),
  partySize: z.coerce.number().int().min(1).max(30),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(20),
  claimedOfferId: z.string().uuid().optional(),
  paymentMethod: z.enum(["card", "mpesa"]).default("card"),
});

export type CreateSwimmingBookingInput = z.infer<typeof createSwimmingBookingSchema>;

// ─── Restaurant ──────────────────────────────────────────────────────────

export const restaurantAvailabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "time must be HH:MM"),
  partySize: z.coerce.number().int().min(1).max(20).default(2),
  durationMinutes: z.coerce.number().int().min(30).max(240).default(90),
});

export const createRestaurantReservationSchema = z.object({
  tableId: z.string().uuid(),
  reservationStart: z.string().datetime({ offset: true }),
  reservationEnd: z.string().datetime({ offset: true }),
  partySize: z.coerce.number().int().min(1).max(20),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(20),
  specialRequests: z.string().trim().max(1000).optional(),
  claimedOfferId: z.string().uuid().optional(),
});

export type CreateRestaurantReservationInput = z.infer<typeof createRestaurantReservationSchema>;

// ─── Conference ──────────────────────────────────────────────────────────

export const conferenceAvailabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be HH:MM"),
  durationHours: z.coerce.number().min(1).max(12).default(2),
  attendeeCount: z.coerce.number().int().min(1).max(200).default(10),
});

export const createConferenceBookingSchema = z.object({
  roomId: z.string().uuid(),
  bookingStart: z.string().datetime({ offset: true }),
  bookingEnd: z.string().datetime({ offset: true }),
  attendeeCount: z.coerce.number().int().min(1).max(200),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(20),
  organizationName: z.string().trim().max(120).optional(),
  purpose: z.string().trim().max(300).optional(),
  paymentMethod: z.enum(["card", "mpesa"]).default("card"),
});

export type CreateConferenceBookingInput = z.infer<typeof createConferenceBookingSchema>;

// ─── Events ──────────────────────────────────────────────────────────────

export const createEventBookingSchema = z.object({
  eventId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(20),
});

export type CreateEventBookingInput = z.infer<typeof createEventBookingSchema>;
