import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';
import { AdminDashboard } from './AdminDashboard';
import { HRDashboard } from './HRDashboard';
import { EmployeeDashboard } from './EmployeeDashboard';

/** GET /api/dashboard returns role-specific data; each role gets its own view. */
export function Dashboard() {
  const { user } = useAuth();

  if (user?.role === ROLES.ADMIN) return <AdminDashboard />;
  if (user?.role === ROLES.HR || user?.role === ROLES.MANAGER) return <HRDashboard />;
  return <EmployeeDashboard />;
}
