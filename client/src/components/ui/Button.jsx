const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
};

/** Shared button. `isLoading` disables the button and swaps the label for "..." rather than a spinner icon. */
export default function Button({ variant = 'primary', isLoading = false, className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
        transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? 'Please wait...' : children}
    </button>
  );
}
