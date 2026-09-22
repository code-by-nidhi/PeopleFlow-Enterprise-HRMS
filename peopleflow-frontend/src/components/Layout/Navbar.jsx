import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Menu, Search, Bell, ChevronDown, User, Settings, LogOut, KeyRound } from 'lucide-react';
import { PAGE_TITLES } from './navigation';
import { Avatar } from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ROLE_LABELS } from '../../utils/constants';
import { isManagement } from '../../utils/auth';

export function Navbar({ onToggleMobile, onOpenLogoutModal }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const menuRef = useRef(null);

  const title = PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] || 'PeopleFlow';

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    navigate(`/employees?q=${encodeURIComponent(term)}`);
    setQuery('');
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button type="button" className="mobile-toggle-btn" onClick={onToggleMobile} aria-label="Open navigation">
          <Menu size={22} />
        </button>
        <span className="breadcrumb-title">{title}</span>
      </div>

      <div className="navbar-right">
        {isManagement(user) && (
          <form className="nav-search" onSubmit={handleSearch} role="search">
            <Search className="search-icon" />
            <input
              type="search"
              placeholder="Search employees…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search employees"
            />
          </form>
        )}

        <Link to="/notifications" className="icon-btn" aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}>
          <Bell size={18} />
          {unreadCount > 0 && <span className="icon-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </Link>

        <div className="user-menu" ref={menuRef}>
          <button
            type="button"
            className="user-profile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Avatar name={user?.name} src={user?.avatar?.url} size={32} />
            <span className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{ROLE_LABELS[user?.role]}</span>
            </span>
            <ChevronDown size={14} className="chevron text-faint" />
          </button>

          {menuOpen && (
            <div className="dropdown" role="menu">
              <div className="dropdown-header">
                <div className="text-sm text-bold truncate">{user?.name}</div>
                <div className="text-xs text-muted truncate">{user?.email}</div>
              </div>
              <Link to="/profile" className="dropdown-item" role="menuitem"><User size={16} /> My Profile</Link>
              <Link to="/change-password" className="dropdown-item" role="menuitem"><KeyRound size={16} /> Change Password</Link>
              <Link to="/settings" className="dropdown-item" role="menuitem"><Settings size={16} /> Settings</Link>
              <button
                type="button"
                className="dropdown-item danger"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenLogoutModal();
                }}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
