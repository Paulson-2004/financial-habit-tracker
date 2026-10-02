import { z } from 'zod';

// Mirrors server/src/validators/feedbackValidators.js (client-side convenience only -
// the server re-validates everything).
export const feedbackFormSchema = z.object({
  type: z.enum(['feedback', 'complaint'], { required_error: 'Choose a type' }),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(150, 'Subject is too long'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000, 'Message is too long'),
});

export const defaultFeedbackFormValues = { type: 'feedback', subject: '', message: '' };

export const FEEDBACK_TYPE_LABELS = { feedback: 'Feedback', complaint: 'Complaint' };
