/** Simple progress bar. `percent` is clamped to [0, 100] for the bar width itself. */
export default function ProgressBar({ percent, tone = 'brand' }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const toneClass = tone === 'positive' ? 'bg-emerald-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-brand-600';

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all ${toneClass}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
