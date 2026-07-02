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
