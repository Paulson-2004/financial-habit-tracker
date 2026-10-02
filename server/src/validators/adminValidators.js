import { z } from 'zod';
import { uuidSchema } from './common.js';

// All admin query/body schemas are .strict() so unknown keys (e.g. a client-sent
// `role`) are rejected - same mass-assignment protection as the auth validators.

export const adminUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100, 'Search is too long').optional(),
    role: z.enum(['user', 'admin']).optional(),
    // Query strings arrive as text, so 'true'/'false' - never a raw boolean or a
    // truthy-coerced value (Boolean('false') === true would invert the filter).
    isActive: z.enum(['true', 'false']).optional(),
  })
  .strict();

export const adminUserIdParamsSchema = z.object({ id: uuidSchema }).strict();

// Role is deliberately absent: admins toggle activation only. There is no endpoint
// that changes anyone's role, so privilege changes stay a database-owner operation
// (see db/seed.js promoteToAdmin) and can never come from a request.
export const updateUserStatusSchema = z
  .object({
    isActive: z.boolean({ invalid_type_error: 'isActive must be a boolean' }),
  })
  .strict();

export const adminFeedbackQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['open', 'in_review', 'resolved']).optional(),
    type: z.enum(['feedback', 'complaint']).optional(),
    search: z.string().trim().max(100, 'Search is too long').optional(),
  })
  .strict();

export const adminFeedbackIdParamsSchema = z.object({ id: uuidSchema }).strict();

export const updateFeedbackStatusSchema = z
  .object({
    status: z.enum(['open', 'in_review', 'resolved']).optional(),
    adminNote: z.string().trim().max(1000, 'Note is too long').nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
