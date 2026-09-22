import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

const ALERT_ICONS = { error: AlertCircle, success: CheckCircle2, info: Info, warning: AlertTriangle };

export function Alert({ type = 'info', children, style }) {
  if (!children) return null;
  const Icon = ALERT_ICONS[type];
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'} style={style}>
      <Icon size={16} />
      <div>{children}</div>
    </div>
  );
}

export function Loader({ label = 'Loading…' }) {
  return (
    <div className="page-loader">
      <span className="spinner" />
      {label}
    </div>
  );
}

/** Full-page error with retry, for detail pages whose main request failed. */
export function LoadError({ message, onRetry }) {
  return (
    <div className="card">
      <div className="empty-state compact">
        <div className="empty-state-icon" style={{ color: 'var(--danger)' }}>
          <AlertCircle size={26} />
        </div>
        <h3 className="empty-state-title">Could not load this page</h3>
        <p className="empty-state-desc">{message}</p>
        {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
      </div>
    </div>
  );
}

export function DetailItem({ icon: Icon, label, children }) {
  return (
    <div className="detail-item">
      {Icon && <Icon size={16} />}
      <div style={{ minWidth: 0 }}>
        <span className="detail-label">{label}</span>
        <span className="detail-value">{children ?? '—'}</span>
      </div>
    </div>
  );
}
