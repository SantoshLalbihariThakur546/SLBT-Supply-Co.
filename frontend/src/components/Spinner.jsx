export default function Spinner({ size = "h-8 w-8" }) {
  return (
    <div
      className={`${size} animate-spin rounded-full border-2 border-slate-300 border-t-brand-600`}
      role="status"
      aria-label="Loading"
    />
  );
}
