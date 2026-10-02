// Pure presentation helpers for the admin panel (no API calls, no React).

export const FEEDBACK_STATUS_LABELS = { open: 'Open', in_review: 'In review', resolved: 'Resolved' };

const STATUS_TONE_CLASSES = {
  open: 'bg-amber-100 text-amber-800',
  in_review: 'bg-sky-100 text-sky-800',
  resolved: 'bg-emerald-100 text-emerald-800',
};

export function feedbackStatusTone(status) {
  return STATUS_TONE_CLASSES[status] ?? 'bg-slate-100 text-slate-700';
}

export function feedbackStatusLabel(status) {
  return FEEDBACK_STATUS_LABELS[status] ?? status;
}

export function userStatusLabel(isActive) {
  return isActive ? 'Active' : 'Disabled';
}

export function userStatusTone(isActive) {
  return isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600';
}
