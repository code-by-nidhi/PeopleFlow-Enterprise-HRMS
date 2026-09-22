/**
 * OpenAPI 3 specification, generated from a compact route table so the docs
 * stay in sync with the routers. Served at /api/docs (UI) and /api/docs.json
 * (import this URL into Postman to get a ready-made collection).
 */
const bearer = [{ bearerAuth: [] }]

const idParam = (name = 'id') => ({ name, in: 'path', required: true, schema: { type: 'string' } })
const q = (name, description, schema = { type: 'string' }) => ({ name, in: 'query', required: false, description, schema })
const page = [q('page', 'Page number', { type: 'integer', default: 1 }), q('limit', 'Items per page (max 100)', { type: 'integer', default: 10 })]

const body = (properties, required = []) => ({
    required: true,
    content: { 'application/json': { schema: { type: 'object', required, properties } } }
})

const fileBody = (extra = {}) => ({
    required: true,
    content: {
        'multipart/form-data': {
            schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' }, ...extra } }
        }
    }
})

const str = (example) => ({ type: 'string', example })
const num = (example) => ({ type: 'number', example })

// [method, path, tag, summary, access, extras]
const routes = [
    ['post', '/auth/login', 'Authentication', 'Login', 'Public', { requestBody: body({ email: str('admin@company.com'), password: str('Admin@123') }, ['email', 'password']) }],
    ['post', '/auth/refresh-token', 'Authentication', 'Rotate refresh token (httpOnly cookie) and get a new access token', 'Public'],
    ['post', '/auth/logout', 'Authentication', 'Logout and revoke the refresh token', 'Public'],
    ['get', '/auth/me', 'Authentication', 'Get logged in user and employee profile', 'Authenticated'],
    ['patch', '/auth/change-password', 'Authentication', 'Change password', 'Authenticated', { requestBody: body({ currentPassword: str(), newPassword: str('NewPass@123'), confirmPassword: str('NewPass@123') }, ['currentPassword', 'newPassword', 'confirmPassword']) }],

    ['post', '/users', 'Users', 'Create admin / HR / manager account (temporary password is emailed)', 'Admin, HR (managers only)', { requestBody: body({ name: str('Priya Nair'), email: str('hr@company.com'), role: { type: 'string', enum: ['admin', 'hr', 'manager'] } }, ['name', 'email', 'role']) }],
    ['get', '/users', 'Users', 'List users', 'Admin', { parameters: [...page, q('search', 'Name or email'), q('role', 'Role'), q('status', 'active | inactive')] }],
    ['get', '/users/options', 'Users', 'Active users for pickers', 'Admin, HR, Manager', { parameters: [q('roles', 'Comma separated roles')] }],
    ['get', '/users/{id}', 'Users', 'Get user by id', 'Admin', { parameters: [idParam()] }],
    ['patch', '/users/{id}', 'Users', 'Update user', 'Admin', { parameters: [idParam()], requestBody: body({ name: str(), email: str(), role: str('manager') }) }],
    ['patch', '/users/{id}/status', 'Users', 'Activate / deactivate user', 'Admin', { parameters: [idParam()], requestBody: body({ isActive: { type: 'boolean' } }, ['isActive']) }],
    ['delete', '/users/{id}', 'Users', 'Delete user and related records', 'Admin', { parameters: [idParam()] }],

    ['post', '/employees', 'Employees', 'Create employee (creates login account + profile)', 'Admin, HR', {
        requestBody: body({
            firstName: str('Rahul'), lastName: str('Sharma'), email: str('rahul@company.com'), password: str('Optional@123'),
            phone: str('9876543210'), department: str('<departmentId>'), designation: str('<designationId>'), joiningDate: str('2026-08-01'),
            employmentType: str('full-time'), salary: { type: 'object', properties: { basic: num(40000), hra: num(8000), allowances: num(2000), deductions: num(1500) } }
        }, ['firstName', 'lastName', 'email', 'department', 'designation', 'joiningDate', 'salary'])
    }],
    ['get', '/employees', 'Employees', 'List employees with search, filters and pagination', 'Admin, HR, Manager', { parameters: [...page, q('q', 'Name, employee ID or email'), q('department', 'Department id'), q('designation', 'Designation id'), q('status', 'active | probation | on-leave | inactive'), q('sort', 'employeeId | firstName | joiningDate | createdAt (prefix - for desc)')] }],
    ['get', '/employees/search', 'Employees', 'Search employees', 'Admin, HR', { parameters: [q('q', 'Search term'), ...page] }],
    ['get', '/employees/profile/me', 'Employees', 'My employee profile', 'Authenticated'],
    ['get', '/employees/{id}', 'Employees', 'Get employee', 'Admin, HR, Manager, Employee (self)', { parameters: [idParam()] }],
    ['patch', '/employees/{id}', 'Employees', 'Update employee', 'Admin, HR', { parameters: [idParam()], requestBody: body({ designation: str(), status: str('active'), salary: { type: 'object' } }) }],
    ['delete', '/employees/{id}', 'Employees', 'Delete employee', 'Admin', { parameters: [idParam()] }],
    ['post', '/employees/{id}/salary-slip', 'Employees', 'Queue salary slip PDF generation', 'Admin, HR', { parameters: [idParam()], requestBody: body({ month: num(8), year: num(2026) }) }],

    ['post', '/departments', 'Departments', 'Create department', 'Admin, HR', { requestBody: body({ name: str('Engineering'), description: str() }, ['name']) }],
    ['get', '/departments', 'Departments', 'List departments with employee counts (cached)', 'Authenticated'],
    ['get', '/departments/{id}', 'Departments', 'Get department', 'Authenticated', { parameters: [idParam()] }],
    ['patch', '/departments/{id}', 'Departments', 'Update department', 'Admin, HR', { parameters: [idParam()], requestBody: body({ name: str(), description: str(), isActive: { type: 'boolean' } }) }],
    ['delete', '/departments/{id}', 'Departments', 'Delete department (must have no employees)', 'Admin, HR', { parameters: [idParam()] }],

    ['post', '/designations', 'Designations', 'Create designation', 'Admin, HR', { requestBody: body({ title: str('Software Engineer'), department: str('<departmentId>'), salaryRange: { type: 'object', properties: { min: num(30000), max: num(80000) } } }, ['title']) }],
    ['get', '/designations', 'Designations', 'List designations (cached)', 'Authenticated', { parameters: [q('department', 'Department id')] }],
    ['get', '/designations/{id}', 'Designations', 'Get designation', 'Authenticated', { parameters: [idParam()] }],
    ['patch', '/designations/{id}', 'Designations', 'Update designation', 'Admin, HR', { parameters: [idParam()], requestBody: body({ title: str(), department: str() }) }],
    ['delete', '/designations/{id}', 'Designations', 'Delete designation (must have no employees)', 'Admin, HR', { parameters: [idParam()] }],

    ['post', '/attendance/verify-location', 'Attendance', 'Step 1 of check-in/out: server validates the GPS fix against the office geofence and returns a 2-minute verificationId. Send header X-Device-Id (optional) for the audit trail.', 'HR, Manager, Employee', {
        requestBody: body({ action: { type: 'string', enum: ['check-in', 'check-out'] }, latitude: num(31.3260), longitude: num(75.5762), accuracy: num(18), capturedAt: num(1790000000000) }, ['action', 'latitude', 'longitude', 'accuracy'])
    }],
    ['post', '/attendance/check-in', 'Attendance', 'Step 2: validate the scanned office QR and record check-in with a server timestamp. Idempotent per verificationId.', 'HR, Manager, Employee', { requestBody: body({ verificationId: str('<verificationId>'), qrCode: str('<raw scanned QR text>') }, ['verificationId', 'qrCode']) }],
    ['post', '/attendance/check-out', 'Attendance', 'Step 2: validate the scanned office QR and close the active session (PATCH also accepted). Idempotent per verificationId.', 'HR, Manager, Employee', { requestBody: body({ verificationId: str('<verificationId>'), qrCode: str('<raw scanned QR text>') }, ['verificationId', 'qrCode']) }],
    ['get', '/attendance/today', 'Attendance', 'My current attendance state (open session, can check in / out)', 'Authenticated'],
    ['get', '/attendance/me', 'Attendance', 'My attendance history + today + month summary', 'Authenticated', { parameters: [...page, q('from', 'YYYY-MM-DD'), q('to', 'YYYY-MM-DD')] }],
    ['get', '/attendance/audit', 'Attendance', 'Attendance audit log (attempts, rejections, corrections)', 'Admin, HR', { parameters: [...page, q('failed', 'true — only failed verifications'), q('action', 'Audit action'), q('reason', 'Reason code, e.g. GEOFENCE_OUTSIDE'), q('userId', 'User id'), q('officeId', 'Office id'), q('search', 'Employee name or email'), q('from', 'YYYY-MM-DD'), q('to', 'YYYY-MM-DD')] }],
    ['post', '/attendance/manual', 'Attendance', 'Manually add attendance for a day without a verified check-in', 'Office correction roles (Admin, HR by default)', { requestBody: body({ userId: str('<userId>'), officeId: str('<officeId>'), checkIn: str('2026-09-21T09:05:00+05:30'), checkOut: str('2026-09-21T18:00:00+05:30'), reason: str('Phone battery died, confirmed by manager') }, ['userId', 'checkIn', 'reason']) }],
    ['patch', '/attendance/{id}/correct', 'Attendance', 'Correct an attendance record (audited; cannot correct your own)', 'Office correction roles (Admin, HR by default)', { parameters: [idParam()], requestBody: body({ checkIn: str(), checkOut: str(), status: str('present'), reason: str('Forgot to check out') }, ['reason']) }],
    ['get', '/attendance', 'Attendance', 'All attendance records + day summary', 'Admin, HR, Manager', { parameters: [...page, q('date', 'YYYY-MM-DD'), q('status', 'present | late | half-day'), q('verification', 'verified | flagged | manual'), q('search', 'Employee name or email')] }],
    ['get', '/attendance/{employeeId}', 'Attendance', 'Attendance of one employee (employee or user id)', 'Admin, HR, Manager, self', { parameters: [idParam('employeeId'), ...page] }],

    ['get', '/offices', 'Offices', 'List offices and their geofence settings', 'Admin, HR', { parameters: [q('status', 'active | inactive')] }],
    ['post', '/offices', 'Offices', 'Create an office geofence', 'Admin, HR', {
        requestBody: body({
            name: str('Head Office'), code: str('HQ'), address: str(), location: { type: 'object', properties: { latitude: num(31.3260), longitude: num(75.5762) } },
            radiusMeters: num(100), timezone: str('Asia/Kolkata'), qrTtlSeconds: num(45), maxAccuracyMeters: num(100),
            rules: { type: 'object', properties: { officeStart: str('09:30'), halfDayHours: num(4), maxShiftHours: num(16) } },
            correctionRoles: { type: 'array', items: { type: 'string', enum: ['admin', 'hr', 'manager'] } }
        }, ['name', 'code', 'location'])
    }],
    ['get', '/offices/{id}', 'Offices', 'Get office', 'Admin, HR', { parameters: [idParam()] }],
    ['patch', '/offices/{id}', 'Offices', 'Update office settings (audited)', 'Admin, HR', { parameters: [idParam()], requestBody: body({ radiusMeters: num(150), isActive: { type: 'boolean' } }) }],
    ['post', '/offices/{id}/qr', 'Offices', 'Issue the next single-use kiosk QR code (SVG data URL). Kiosks listen on Socket.io "attendance:qr-consumed" after emitting "kiosk:join" with the office id.', 'Admin, HR', { parameters: [idParam()] }],

    ['post', '/leaves', 'Leaves', 'Apply for leave', 'Authenticated', { requestBody: body({ leaveType: { type: 'string', enum: ['casual', 'sick', 'earned', 'unpaid'] }, startDate: str('2026-09-20'), endDate: str('2026-09-22'), reason: str('Family function') }, ['leaveType', 'startDate', 'endDate', 'reason']) }],
    ['get', '/leaves', 'Leaves', 'All leave requests', 'Admin, HR, Manager', { parameters: [...page, q('status', 'Status'), q('leaveType', 'Type'), q('search', 'Employee name or email')] }],
    ['get', '/leaves/me', 'Leaves', 'My leave requests and balance', 'Authenticated', { parameters: [...page, q('status', 'Status')] }],
    ['get', '/leaves/{id}', 'Leaves', 'Get leave request', 'Owner, Admin, HR, Manager', { parameters: [idParam()] }],
    ['patch', '/leaves/{id}/approve', 'Leaves', 'Approve leave (deducts balance)', 'Admin, HR, Manager', { parameters: [idParam()], requestBody: body({ note: str() }) }],
    ['patch', '/leaves/{id}/reject', 'Leaves', 'Reject leave', 'Admin, HR, Manager', { parameters: [idParam()], requestBody: body({ note: str('Project deadline') }) }],
    ['patch', '/leaves/{id}/cancel', 'Leaves', 'Cancel my leave (refunds balance if approved)', 'Owner', { parameters: [idParam()] }],

    ['post', '/tasks', 'Tasks', 'Assign task', 'Admin, HR, Manager', { requestBody: body({ title: str('Prepare Q3 report'), description: str(), assignedTo: str('<userId>'), priority: { type: 'string', enum: ['low', 'medium', 'high'] }, deadline: str('2026-09-30') }, ['title', 'assignedTo', 'deadline']) }],
    ['get', '/tasks', 'Tasks', 'All tasks', 'Admin, HR, Manager', { parameters: [...page, q('status', 'Status'), q('priority', 'Priority'), q('assignedTo', 'User id'), q('search', 'Title'), q('overdue', 'true'), q('sort', 'deadline | -deadline | newest')] }],
    ['get', '/tasks/me', 'Tasks', 'My tasks', 'Authenticated', { parameters: [...page, q('status', 'Status'), q('priority', 'Priority')] }],
    ['get', '/tasks/{id}', 'Tasks', 'Get task', 'Assignee, creator, Admin, HR, Manager', { parameters: [idParam()] }],
    ['patch', '/tasks/{id}', 'Tasks', 'Update task (assignees may only change status)', 'Assignee, Admin, HR, Manager', { parameters: [idParam()], requestBody: body({ status: { type: 'string', enum: ['pending', 'in-progress', 'completed'] } }) }],
    ['delete', '/tasks/{id}', 'Tasks', 'Delete task', 'Admin, HR, Manager', { parameters: [idParam()] }],

    ['get', '/dashboard', 'Dashboard', 'Role-based dashboard data (cached)', 'Authenticated', { parameters: [q('view', 'personal — managers can request their personal view')] }],

    ['post', '/upload/profile', 'Upload', 'Upload profile picture (jpg/png/webp, 5MB)', 'Authenticated (Admin/HR may pass ?userId)', { parameters: [q('userId', 'Target user')], requestBody: fileBody() }],
    ['post', '/upload/resume', 'Upload', 'Upload resume (pdf/doc/docx, 10MB)', 'Authenticated (Admin/HR may pass ?employeeId)', { parameters: [q('employeeId', 'Target employee')], requestBody: fileBody() }],
    ['post', '/upload/documents', 'Upload', 'Upload employee document', 'Authenticated (Admin/HR may pass ?employeeId)', { parameters: [q('employeeId', 'Target employee')], requestBody: fileBody({ name: str('PAN Card'), type: { type: 'string', enum: ['id-proof', 'salary-slip', 'other'] } }) }],
    ['delete', '/upload/{id}', 'Upload', 'Delete document or resume', 'Owner, Admin, HR', { parameters: [idParam()] }],

    ['get', '/notifications', 'Notifications', 'My notifications', 'Authenticated', { parameters: [...page, q('unread', 'true')] }],
    ['patch', '/notifications/read-all', 'Notifications', 'Mark all as read', 'Authenticated'],
    ['patch', '/notifications/{id}/read', 'Notifications', 'Mark as read', 'Authenticated', { parameters: [idParam()] }],
    ['delete', '/notifications/{id}', 'Notifications', 'Delete notification', 'Authenticated', { parameters: [idParam()] }]
]

const paths = {}
routes.forEach(([method, path, tag, summary, access, extras = {}]) => {
    paths[path] = paths[path] || {}
    paths[path][method] = {
        tags: [tag],
        summary,
        description: `Access: ${access}`,
        ...(access === 'Public' ? {} : { security: bearer }),
        responses: {
            200: { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
            400: { $ref: '#/components/responses/Error' },
            401: { $ref: '#/components/responses/Error' },
            403: { $ref: '#/components/responses/Error' }
        },
        ...extras
    }
})

module.exports = {
    openapi: '3.0.3',
    info: {
        title: 'PeopleFlow Enterprise HRMS API',
        version: '1.0.0',
        description: 'REST API for authentication, RBAC, employees, departments, attendance, leave, tasks, uploads, dashboard and real-time notifications.\n\nReal-time events: connect with Socket.io using `auth: { token: <accessToken> }` and listen for `notification`.'
    },
    servers: [{ url: '/api' }],
    tags: ['Authentication', 'Users', 'Employees', 'Departments', 'Designations', 'Attendance', 'Offices', 'Leaves', 'Tasks', 'Dashboard', 'Upload', 'Notifications'].map((name) => ({ name })),
    components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
        schemas: {
            Success: {
                type: 'object',
                properties: { success: { type: 'boolean', example: true }, message: { type: 'string' }, data: {}, meta: { type: 'object' } }
            }
        },
        responses: {
            Error: {
                description: 'Error',
                content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: false }, message: { type: 'string' } } } } }
            }
        }
    },
    paths
}
