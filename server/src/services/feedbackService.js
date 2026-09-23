import { AppError } from '../utils/AppError.js';
import * as feedbackDb from '../db/queries/feedback.js';

// userId is left out of the response - the viewer already knows it's theirs (see
// AGENTS.md section 11 - avoid exposing internal ids the client doesn't need).
function toPublicFeedback(row) {
  return {
    id: row.id,
    type: row.type,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createFeedback(userId, body) {
  const row = await feedbackDb.insertFeedback(userId, body);
  return toPublicFeedback(row);
}

export async function getFeedback(userId, id) {
  const row = await feedbackDb.findFeedbackById(userId, id);
  // Not found and not-yours are indistinguishable on purpose - see AGENTS.md section 7.
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Feedback not found.');
  return toPublicFeedback(row);
}

export async function listMyFeedback(userId, { page, pageSize }) {
  const { rows, total } = await feedbackDb.listFeedbackByUser(userId, { page, pageSize });
  return {
    rows: rows.map(toPublicFeedback),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
