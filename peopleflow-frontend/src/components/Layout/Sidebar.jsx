import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, ShieldCheck, X } from 'lucide-react';
import { NAV_SECTIONS } from './navigation';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export function Sidebar({ mobileOpen, onCloseMobile, onOpenLogoutModal }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const sections = NAV_SECTIONS
    .map((section) => ({ ...section, items: section.items.filter((item) => item.roles.includes(user?.role)) }))
    .filter((section) => section.items.length);

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onCloseMobile} />}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand">
          <div className="brand-icon-bg">
            <ShieldCheck size={20} />
          </div>
          <span className="brand-title">PeopleFlow</span>
          <span className="brand-badge">HRMS</span>
          <button type="button" className="sidebar-close-btn" onClick={onCloseMobile} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {sections.map((section) => (
            <React.Fragment key={section.label}>
              <span className="nav-section-label">{section.label}</span>
              {section.items.map(({ label, path, icon: Icon, end, badge }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={end}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={onCloseMobile}
                >
                  <Icon className="nav-icon" />
                  <span>{label}</span>
                  {badge === 'notifications' && unreadCount > 0 && (
                    <span className="nav-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </NavLink>
              ))}
            </React.Fragment>
          ))}

          <div className="sidebar-footer">
            <button type="button" className="nav-item logout" onClick={onOpenLogoutModal}>
              <LogOut className="nav-icon" />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}
