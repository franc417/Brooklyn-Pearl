import { z } from "zod";

export const availabilityQuerySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkIn must be YYYY-MM-DD"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkOut must be YYYY-MM-DD"),
  guests: z.coerce.number().int().min(1).max(12).default(1),
  roomTypeSlug: z.string().optional(), // omit or "any" to search all room types
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
});

export type CreateRestaurantReservationInput = z.infer<typeof createRestaurantReservationSchema>;
