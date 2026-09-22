import React from 'react';

export function StatCard({ label, value, icon: Icon, subtext, loading = false }) {
  return (
    <div className="stat-card">
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        {loading ? (
          <span className="skeleton" style={{ height: 30, width: 64, margin: '0.35rem 0' }} />
        ) : (
          <span className="stat-value">{value ?? '—'}</span>
        )}
        {subtext && <span className="stat-subtext">{subtext}</span>}
      </div>
      {Icon && (
        <div className="stat-icon-wrapper">
          <Icon size={22} />
        </div>
      )}
    </div>
  );
}
