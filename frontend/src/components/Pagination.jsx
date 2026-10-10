export default function Pagination({ page, hasNext, hasPrevious, onChange }) {
  if (!hasNext && !hasPrevious) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <button
        className="btn-secondary"
        disabled={!hasPrevious}
        onClick={() => onChange(page - 1)}
      >
        ← Previous
      </button>
      <span className="text-sm font-medium text-slate-600">Page {page}</span>
      <button
        className="btn-secondary"
        disabled={!hasNext}
        onClick={() => onChange(page + 1)}
      >
        Next →
      </button>
    </div>
  );
}
