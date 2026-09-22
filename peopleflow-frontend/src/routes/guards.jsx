import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Forbidden } from '../pages/errors/ErrorPages';

function FullscreenLoader() {
  return (
    <div className="fullscreen-loader">
      <div className="brand-icon-bg" style={{ width: 48, height: 48 }}>
        <ShieldCheck size={26} />
      </div>
      <span className="spinner" />
    </div>
  );
}

/** Requires a session; first-login users are held on the change-password screen. */
export function ProtectedRoute() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullscreenLoader />;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}

/** Keeps signed-in users away from the login page. */
export function PublicOnlyRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <FullscreenLoader />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function RoleRoute({ roles }) {
  const { user } = useAuth();
  return roles.includes(user?.role) ? <Outlet /> : <Forbidden />;
}
