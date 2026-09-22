import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Clock,
  CalendarDays,
  CheckSquare,
  UserCheck,
  Bell,
  User,
  Settings,
  Timer,
  CalendarCheck,
  ListTodo,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { ROLES } from '../../utils/constants';

const { ADMIN, HR, MANAGER, EMPLOYEE } = ROLES;
const ALL = [ADMIN, HR, MANAGER, EMPLOYEE];

/** Sidebar sections; items are filtered by the signed-in user's role. */
export const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ALL }],
  },
  {
    label: 'People',
    items: [
      { label: 'Employees', path: '/employees', icon: Users, roles: [ADMIN, HR, MANAGER] },
      { label: 'Departments', path: '/departments', icon: Building2, roles: [ADMIN, HR] },
      { label: 'Designations', path: '/designations', icon: Briefcase, roles: [ADMIN, HR] },
      { label: 'User Accounts', path: '/users', icon: UserCheck, roles: [ADMIN] },
    ],
  },
  {
    label: 'Workflows',
    items: [
      { label: 'Attendance', path: '/attendance', icon: Clock, roles: [ADMIN, HR, MANAGER], end: true },
      { label: 'Office Locations', path: '/attendance/offices', icon: MapPin, roles: [ADMIN, HR] },
      { label: 'Attendance Audit', path: '/attendance/audit', icon: ShieldAlert, roles: [ADMIN, HR] },
      { label: 'Leave Management', path: '/leaves', icon: CalendarDays, roles: [ADMIN, HR, MANAGER], end: true },
      { label: 'Tasks', path: '/tasks', icon: CheckSquare, roles: [ADMIN, HR, MANAGER], end: true },
    ],
  },
  {
    label: 'My Workspace',
    items: [
      { label: 'My Attendance', path: '/attendance/my', icon: Timer, roles: [HR, MANAGER, EMPLOYEE] },
      { label: 'My Leaves', path: '/leaves/my', icon: CalendarCheck, roles: [HR, MANAGER, EMPLOYEE] },
      { label: 'My Tasks', path: '/tasks/my', icon: ListTodo, roles: [HR, MANAGER, EMPLOYEE] },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Notifications', path: '/notifications', icon: Bell, roles: ALL, badge: 'notifications' },
      { label: 'Profile', path: '/profile', icon: User, roles: ALL },
      { label: 'Settings', path: '/settings', icon: Settings, roles: ALL },
    ],
  },
];

/** Page titles for the top bar, most specific prefix first. */
export const PAGE_TITLES = [
  ['/dashboard', 'Dashboard'],
  ['/employees', 'Employee Management'],
  ['/departments', 'Departments'],
  ['/designations', 'Designations'],
  ['/attendance/my', 'My Attendance'],
  ['/attendance/offices', 'Office Locations'],
  ['/attendance/audit', 'Attendance Audit'],
  ['/attendance', 'Attendance'],
  ['/leaves/my', 'My Leaves'],
  ['/leaves', 'Leave Management'],
  ['/tasks/my', 'My Tasks'],
  ['/tasks', 'Task Management'],
  ['/users', 'User Accounts'],
  ['/notifications', 'Notifications'],
  ['/profile', 'My Profile'],
  ['/settings', 'Settings'],
];
