import React from 'react';
import { AlertCircle } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

/**
 * Data-driven table that collapses into labelled cards on phones.
 *
 * columns: [{
 *   key, header,
 *   render?: (row) => node,     // defaults to row[key]
 *   lead?: boolean,             // shown as the card title on mobile (no label)
 *   align?: 'right',
 *   width?: number | string,
 * }]
 */
export function DataTable({
  columns,
  rows = [],
  rowKey = '_id',
  loading = false,
  error = null,
  onRetry,
  empty = {},
  onRowClick,
  skeletonRows = 5,
}) {
  const colSpan = columns.length;

  let body;
  if (loading && !rows.length) {
    body = Array.from({ length: skeletonRows }, (_, i) => (
      <tr key={`skeleton-${i}`}>
        {columns.map((col) => (
          <td key={col.key} data-label={col.header} className={col.lead ? 'cell-lead' : undefined}>
            <span className="skeleton" style={{ display: 'block', height: 14, width: col.lead ? '70%' : '60%' }} />
          </td>
        ))}
      </tr>
    ));
  } else if (error) {
    body = (
      <tr>
        <td colSpan={colSpan} className="cell-full">
          <div className="empty-state compact">
            <div className="empty-state-icon" style={{ color: 'var(--danger)' }}>
              <AlertCircle size={26} />
            </div>
            <h3 className="empty-state-title">Could not load data</h3>
            <p className="empty-state-desc">{error}</p>
            {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
          </div>
        </td>
      </tr>
    );
  } else if (!rows.length) {
    body = (
      <tr>
        <td colSpan={colSpan} className="cell-full">
          <EmptyState compact {...empty} />
        </td>
      </tr>
    );
  } else {
    body = rows.map((row) => (
      <tr
        key={typeof rowKey === 'function' ? rowKey(row) : row[rowKey]}
        className={onRowClick ? 'clickable' : undefined}
        onClick={onRowClick ? (e) => {
          // Ignore clicks on buttons/links/inputs inside the row
          if (!e.target.closest('button, a, input, select, label')) onRowClick(row);
        } : undefined}
      >
        {columns.map((col) => (
          <td
            key={col.key}
            data-label={col.header}
            className={[col.lead && 'cell-lead', col.align === 'right' && 'align-right'].filter(Boolean).join(' ') || undefined}
          >
            {col.render ? col.render(row) : (row[col.key] ?? '—')}
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <div className="table-responsive" style={{ opacity: loading && rows.length ? 0.6 : 1, transition: 'opacity 0.15s' }}>
      <table className="data-table stack-mobile">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width, textAlign: col.align }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}
