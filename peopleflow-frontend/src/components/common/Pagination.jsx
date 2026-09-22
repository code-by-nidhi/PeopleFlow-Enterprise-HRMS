import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** meta: { page, limit, total, totalPages } as returned by list endpoints */
export function Pagination({ meta, onPageChange }) {
  if (!meta || !meta.total) return null;

  const { page, limit, total, totalPages } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Window of up to 5 page numbers around the current page
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);

  return (
    <div className="pagination">
      <span>
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong>
      </span>
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button type="button" className="page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>
          {pages.map((p) => (
            <button
              type="button"
              key={p}
              className={`page-btn page-number ${p === page ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ))}
          <button type="button" className="page-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
