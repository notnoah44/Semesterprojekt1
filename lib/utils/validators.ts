import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = loginSchema.extend({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'fixes.passwordMismatch', path: ['confirmPassword'],
});

export const profileSchema = z.object({
  full_name: z.string().min(2),
  birth_year: z.number().int().min(1900).max(new Date().getFullYear() - 18).optional(),
  job: z.string().optional(),
  bio: z.string().max(500).optional(),
});

export const listingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().optional(),
  city: z.string().min(2),
  country: z.string().min(2),
  available_from: z.string(),
  available_to: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ListingInput = z.infer<typeof listingSchema>;
