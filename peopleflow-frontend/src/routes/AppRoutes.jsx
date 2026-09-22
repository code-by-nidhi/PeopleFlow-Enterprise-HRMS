import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout/Layout';
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './guards';
import { Loader } from '../components/common/Feedback';
import { NotFound } from '../pages/errors/ErrorPages';
import { ROLES, MANAGEMENT_ROLES, ORG_EDITORS } from '../utils/constants';

// Pages use named exports; lazy() needs a default export
const page = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })));

const Login = page(() => import('../pages/auth/Login'), 'Login');
const ChangePassword = page(() => import('../pages/auth/ChangePassword'), 'ChangePassword');

const Dashboard = page(() => import('../pages/dashboard/Dashboard'), 'Dashboard');

const EmployeeList = page(() => import('../pages/employees/EmployeeList'), 'EmployeeList');
const AddEmployee = page(() => import('../pages/employees/AddEmployee'), 'AddEmployee');
const EmployeeDetails = page(() => import('../pages/employees/EmployeeDetails'), 'EmployeeDetails');
const EditEmployee = page(() => import('../pages/employees/EditEmployee'), 'EditEmployee');

const DepartmentList = page(() => import('../pages/departments/DepartmentList'), 'DepartmentList');
const AddDepartment = page(() => import('../pages/departments/AddDepartment'), 'AddDepartment');
const EditDepartment = page(() => import('../pages/departments/EditDepartment'), 'EditDepartment');

const DesignationList = page(() => import('../pages/designations/DesignationList'), 'DesignationList');
const AddDesignation = page(() => import('../pages/designations/AddDesignation'), 'AddDesignation');
const EditDesignation = page(() => import('../pages/designations/EditDesignation'), 'EditDesignation');

const AttendanceDashboard = page(() => import('../pages/attendance/AttendanceDashboard'), 'AttendanceDashboard');
const MyAttendance = page(() => import('../pages/attendance/MyAttendance'), 'MyAttendance');
const EmployeeAttendance = page(() => import('../pages/attendance/EmployeeAttendance'), 'EmployeeAttendance');
const OfficeSettings = page(() => import('../pages/attendance/OfficeSettings'), 'OfficeSettings');
const OfficeKiosk = page(() => import('../pages/attendance/OfficeKiosk'), 'OfficeKiosk');
const AttendanceAudit = page(() => import('../pages/attendance/AttendanceAudit'), 'AttendanceAudit');

const LeaveManagement = page(() => import('../pages/leaves/LeaveManagement'), 'LeaveManagement');
const MyLeaves = page(() => import('../pages/leaves/MyLeaves'), 'MyLeaves');
const LeaveDetails = page(() => import('../pages/leaves/LeaveDetails'), 'LeaveDetails');

const TaskList = page(() => import('../pages/tasks/TaskList'), 'TaskList');
const MyTasks = page(() => import('../pages/tasks/MyTasks'), 'MyTasks');
const CreateTask = page(() => import('../pages/tasks/CreateTask'), 'CreateTask');
const TaskDetails = page(() => import('../pages/tasks/TaskDetails'), 'TaskDetails');

const UserList = page(() => import('../pages/users/UserList'), 'UserList');
const CreateUser = page(() => import('../pages/users/CreateUser'), 'CreateUser');
const UserDetails = page(() => import('../pages/users/UserDetails'), 'UserDetails');
const EditUser = page(() => import('../pages/users/EditUser'), 'EditUser');

const Notifications = page(() => import('../pages/notifications/Notifications'), 'Notifications');
const Profile = page(() => import('../pages/profile/Profile'), 'Profile');
const Settings = page(() => import('../pages/settings/Settings'), 'Settings');

export function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePassword />} />

          {/* Full-screen office QR display (no sidebar), Admin & HR */}
          <Route element={<RoleRoute roles={ORG_EDITORS} />}>
            <Route path="/attendance/kiosk/:officeId" element={<OfficeKiosk />} />
          </Route>

          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Older role-specific URLs now resolve to the role-aware dashboard */}
            <Route path="/dashboard/*" element={<Navigate to="/dashboard" replace />} />

            {/* Self-service (every role) */}
            <Route path="/attendance/my" element={<MyAttendance />} />
            <Route path="/leaves/my" element={<MyLeaves />} />
            <Route path="/leaves/:id" element={<LeaveDetails />} />
            <Route path="/tasks/my" element={<MyTasks />} />
            <Route path="/tasks/:id" element={<TaskDetails />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />

            {/* Admin, HR & Manager */}
            <Route element={<RoleRoute roles={MANAGEMENT_ROLES} />}>
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/employees/:id" element={<EmployeeDetails />} />
              <Route path="/departments" element={<DepartmentList />} />
              <Route path="/designations" element={<DesignationList />} />
              <Route path="/attendance" element={<AttendanceDashboard />} />
              <Route path="/attendance/employee/:id" element={<EmployeeAttendance />} />
              <Route path="/leaves" element={<LeaveManagement />} />
              <Route path="/tasks" element={<TaskList />} />
              <Route path="/tasks/create" element={<CreateTask />} />
              <Route path="/tasks/:id/edit" element={<CreateTask />} />
            </Route>

            {/* Admin & HR */}
            <Route element={<RoleRoute roles={ORG_EDITORS} />}>
              <Route path="/employees/add" element={<AddEmployee />} />
              <Route path="/employees/:id/edit" element={<EditEmployee />} />
              <Route path="/departments/add" element={<AddDepartment />} />
              <Route path="/departments/:id/edit" element={<EditDepartment />} />
              <Route path="/designations/add" element={<AddDesignation />} />
              <Route path="/designations/:id/edit" element={<EditDesignation />} />
              <Route path="/users/create" element={<CreateUser />} />
              <Route path="/attendance/offices" element={<OfficeSettings />} />
              <Route path="/attendance/audit" element={<AttendanceAudit />} />
            </Route>

            {/* Admin only */}
            <Route element={<RoleRoute roles={[ROLES.ADMIN]} />}>
              <Route path="/users" element={<UserList />} />
              <Route path="/users/:id" element={<UserDetails />} />
              <Route path="/users/:id/edit" element={<EditUser />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
