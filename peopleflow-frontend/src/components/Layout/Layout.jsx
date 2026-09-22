import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Modal } from '../common/Modal';
import { Loader } from '../common/Feedback';
import { useAuth } from '../../context/AuthContext';

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Close the drawer on navigation and scroll new pages to the top
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', mobileOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [mobileOpen]);

  const openLogout = useCallback(() => {
    setMobileOpen(false);
    setLogoutModalOpen(true);
  }, []);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setLogoutModalOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-layout">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onOpenLogoutModal={openLogout}
      />
      <div className="main-wrapper">
        <Navbar onToggleMobile={() => setMobileOpen((open) => !open)} onOpenLogoutModal={openLogout} />
        <main className="main-content">
          <Suspense fallback={<Loader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <Modal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        title="Confirm Logout"
        confirmLabel="Logout"
        variant="danger"
        onConfirm={handleConfirmLogout}
        confirmLoading={loggingOut}
      >
        <p>Are you sure you want to end your session and log out of PeopleFlow?</p>
      </Modal>
    </div>
  );
}
