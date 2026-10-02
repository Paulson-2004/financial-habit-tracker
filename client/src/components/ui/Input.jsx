import { forwardRef, useId } from 'react';

/** Labeled text input with an inline field error, for use with react-hook-form's register(). */
const Input = forwardRef(function Input({ label, error, id, className = '', ...props }, ref) {
  // Callers (react-hook-form's register()) don't pass an id, so generate one -
  // otherwise the <label> is never associated with the <input> for assistive tech.
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        aria-invalid={Boolean(error)}
        className={`rounded-lg border px-3 py-2 text-sm shadow-sm outline-none transition-colors
          focus:ring-2 focus:ring-brand-500 focus:border-brand-500
          ${error ? 'border-red-400' : 'border-slate-300'} ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
});

export default Input;
