import api from './client';
import { getDeviceId } from '../utils/device';

/*
 * Every list/get helper accepts an optional axios config as its last argument
 * so callers can pass { signal } for request cancellation.
 */

export const authApi = {
  login: (body) => api.post('/auth/login', body),
  logout: () => api.post('/auth/logout'),
  me: (config) => api.get('/auth/me', config),
  changePassword: (body) => api.patch('/auth/change-password', body),
};

export const usersApi = {
  list: (params, config) => api.get('/users', { params, ...config }),
  options: (roles, config) => api.get('/users/options', { params: roles ? { roles } : undefined, ...config }),
  get: (id, config) => api.get(`/users/${id}`, config),
  create: (body) => api.post('/users', body),
  update: (id, body) => api.patch(`/users/${id}`, body),
  setStatus: (id, isActive) => api.patch(`/users/${id}/status`, { isActive }),
  remove: (id) => api.delete(`/users/${id}`),
};

export const employeesApi = {
  list: (params, config) => api.get('/employees', { params, ...config }),
  get: (id, config) => api.get(`/employees/${id}`, config),
  me: (config) => api.get('/employees/profile/me', config),
  create: (body) => api.post('/employees', body),
  update: (id, body) => api.patch(`/employees/${id}`, body),
  remove: (id) => api.delete(`/employees/${id}`),
  generateSalarySlip: (id, body) => api.post(`/employees/${id}/salary-slip`, body),
};

export const departmentsApi = {
  list: (config) => api.get('/departments', config),
  get: (id, config) => api.get(`/departments/${id}`, config),
  create: (body) => api.post('/departments', body),
  update: (id, body) => api.patch(`/departments/${id}`, body),
  remove: (id) => api.delete(`/departments/${id}`),
};

export const designationsApi = {
  list: (params, config) => api.get('/designations', { params, ...config }),
  get: (id, config) => api.get(`/designations/${id}`, config),
  create: (body) => api.post('/designations', body),
  update: (id, body) => api.patch(`/designations/${id}`, body),
  remove: (id) => api.delete(`/designations/${id}`),
};

const withDevice = () => ({ headers: { 'X-Device-Id': getDeviceId() } });

export const attendanceApi = {
  // Verified flow: location first, then the office QR. Times always come from the server.
  verifyLocation: (body) => api.post('/attendance/verify-location', body, withDevice()),
  checkIn: (body) => api.post('/attendance/check-in', body, withDevice()),
  checkOut: (body) => api.post('/attendance/check-out', body, withDevice()),
  today: (config) => api.get('/attendance/today', config),
  me: (params, config) => api.get('/attendance/me', { params, ...config }),
  list: (params, config) => api.get('/attendance', { params, ...config }),
  forEmployee: (id, params, config) => api.get(`/attendance/${id}`, { params, ...config }),
  audit: (params, config) => api.get('/attendance/audit', { params, ...config }),
  correct: (id, body) => api.patch(`/attendance/${id}/correct`, body),
  createManual: (body) => api.post('/attendance/manual', body),
};

export const officesApi = {
  list: (params, config) => api.get('/offices', { params, ...config }),
  get: (id, config) => api.get(`/offices/${id}`, config),
  create: (body) => api.post('/offices', body),
  update: (id, body) => api.patch(`/offices/${id}`, body),
  generateQr: (id, config) => api.post(`/offices/${id}/qr`, null, config),
};

export const leavesApi = {
  apply: (body) => api.post('/leaves', body),
  list: (params, config) => api.get('/leaves', { params, ...config }),
  me: (params, config) => api.get('/leaves/me', { params, ...config }),
  get: (id, config) => api.get(`/leaves/${id}`, config),
  approve: (id, note) => api.patch(`/leaves/${id}/approve`, { note }),
  reject: (id, note) => api.patch(`/leaves/${id}/reject`, { note }),
  cancel: (id) => api.patch(`/leaves/${id}/cancel`),
};

export const tasksApi = {
  create: (body) => api.post('/tasks', body),
  list: (params, config) => api.get('/tasks', { params, ...config }),
  me: (params, config) => api.get('/tasks/me', { params, ...config }),
  get: (id, config) => api.get(`/tasks/${id}`, config),
  update: (id, body) => api.patch(`/tasks/${id}`, body),
  remove: (id) => api.delete(`/tasks/${id}`),
};

export const dashboardApi = {
  get: (params, config) => api.get('/dashboard', { params, ...config }),
};

const multipart = (file, fields = {}) => {
  const form = new FormData();
  form.append('file', file);
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });
  return form;
};

export const uploadApi = {
  profile: (file, userId) => api.post('/upload/profile', multipart(file), { params: userId ? { userId } : undefined }),
  resume: (file, employeeId) => api.post('/upload/resume', multipart(file), { params: employeeId ? { employeeId } : undefined }),
  document: (file, { name, type, employeeId } = {}) =>
    api.post('/upload/documents', multipart(file, { name, type }), { params: employeeId ? { employeeId } : undefined }),
  remove: (id) => api.delete(`/upload/${id}`),
};

export const notificationsApi = {
  list: (params, config) => api.get('/notifications', { params, ...config }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};
