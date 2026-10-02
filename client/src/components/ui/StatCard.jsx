import Card from './Card.jsx';

const TONE_CLASSES = { positive: 'text-emerald-600', negative: 'text-red-600', neutral: 'text-slate-900' };

/** A single headline number. Sign and color together convey positive/negative (never color alone). */
export default function StatCard({ label, value, tone = 'neutral', sublabel }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${TONE_CLASSES[tone]}`}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
    </Card>
  );
}
