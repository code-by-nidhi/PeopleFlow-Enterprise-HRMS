import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { LoadError } from '../../components/common/Feedback';
import { StatCard } from '../../components/common/StatCard';

/** Card wrapper for a chart with a title row and an empty-data fallback. */
export function ChartCard({ title, subtitle, icon: Icon = BarChart3, isEmpty = false, emptyText = 'No data recorded yet', action, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div style={{ minWidth: 0 }}>
          <h3 className="card-title">{title}</h3>
          {subtitle && <span className="card-subtitle">{subtitle}</span>}
        </div>
        {action || <Icon size={18} className="card-icon" />}
      </div>
      {isEmpty ? (
        <div className="empty-state compact">
          <div className="empty-state-icon"><Icon size={24} /></div>
          <p className="empty-state-desc">{emptyText}</p>
        </div>
      ) : children}
    </div>
  );
}

export function ViewAllButton({ to }) {
  const navigate = useNavigate();
  return (
    <Button variant="secondary" size="sm" onClick={() => navigate(to)}>
      View all
    </Button>
  );
}

/** Skeleton shown while the dashboard request is in flight. */
export function DashboardSkeleton({ cards = 4 }) {
  return (
    <>
      <div className="stats-grid">
        {Array.from({ length: cards }, (_, i) => <StatCard key={i} label="Loading" loading />)}
      </div>
      <div className="grid-2 section-gap">
        {[0, 1].map((i) => (
          <div className="card" key={i}>
            <span className="skeleton" style={{ display: 'block', height: 16, width: '40%', marginBottom: 16 }} />
            <span className="skeleton" style={{ display: 'block', height: 220 }} />
          </div>
        ))}
      </div>
    </>
  );
}

export function DashboardError({ message, onRetry }) {
  return <LoadError message={message} onRetry={onRetry} />;
}

/** Compact clickable row used in dashboard lists. */
export function ListRow({ leading, title, meta, status, statusLabel, onClick, actions }) {
  return (
    <div
      className={`list-item wrap-mobile ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {leading}
      <div className="list-item-body">
        {title && <span className="list-item-title truncate">{title}</span>}
        {meta && <span className="list-item-meta">{meta}</span>}
      </div>
      {(status || actions) && (
        <div className="list-item-actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {status && <StatusBadge status={status} label={statusLabel} />}
          {actions}
        </div>
      )}
    </div>
  );
}

export const sum = (values = []) => values.reduce((total, value) => total + (value || 0), 0);
