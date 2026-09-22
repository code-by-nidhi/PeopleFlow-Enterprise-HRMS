import React from 'react';

/** Card with a title/subtitle header and an icon, shared by the profile cards. */
export function ProfileSection({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <span className="card-subtitle">{subtitle}</span>}
        </div>
        {Icon && <Icon size={20} className="card-icon" />}
      </div>
      {children}
    </section>
  );
}
