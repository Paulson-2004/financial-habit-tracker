import { z } from 'zod';
import { uuidSchema } from './common.js';

export const feedbackTypeSchema = z.enum(['feedback', 'complaint']);

export const createFeedbackSchema = z
  .object({
    type: feedbackTypeSchema,
    subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(150, 'Subject is too long'),
    message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000, 'Message is too long'),
  })
  .strict();

export const feedbackListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const feedbackIdParamsSchema = z.object({ id: uuidSchema }).strict();
