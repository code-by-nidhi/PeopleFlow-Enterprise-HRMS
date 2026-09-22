import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, CalendarClock, Camera, User, Clock, CalendarDays, CheckSquare, FileText, Briefcase, Wallet,
  Mail, Phone, VenusAndMars, Cake, MapPin, Building2, UserRound, BadgeCheck, CalendarPlus, ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Loader, LoadError, DetailItem } from '../../components/common/Feedback';
import { AttendanceTab, LeavesTab, TasksTab } from './EmployeeActivityTabs';
import { DocumentsTab } from './EmployeeDocuments';
import { useFetch } from '../../hooks/useFetch';
import { useAction } from '../../hooks/useAction';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { employeesApi, uploadApi } from '../../api/endpoints';
import { EMPLOYEE_STATUS_LABELS, EMPLOYMENT_TYPE_LABELS, GENDER_LABELS } from '../../utils/constants';
import { canEditOrganisation, isAdmin } from '../../utils/auth';
import { employeeName, formatCurrency, formatDate, formatDateTime } from '../../utils/format';

const TABS = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'attendance', label: 'Attendance', icon: Clock },
  { key: 'leaves', label: 'Leaves', icon: CalendarDays },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'documents', label: 'Documents', icon: FileText },
];

const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function OverviewTab({ employee, canEdit, showAccountLink }) {
  const salary = employee.salary || {};

  return (
    <div className="stack">
      <div className="grid-2">
        <div className="card">
          <div className="card-title-row">
            <User size={18} />
            <h3 className="card-title">Personal Information</h3>
          </div>
          <div className="detail-list">
            <DetailItem icon={Mail} label="Email">{employee.user?.email}</DetailItem>
            <DetailItem icon={Phone} label="Phone">{employee.phone || null}</DetailItem>
            <DetailItem icon={VenusAndMars} label="Gender">{GENDER_LABELS[employee.gender] || null}</DetailItem>
            <DetailItem icon={Cake} label="Date of Birth">{employee.dateOfBirth ? formatDate(employee.dateOfBirth) : null}</DetailItem>
            <DetailItem icon={MapPin} label="Address">{employee.address || null}</DetailItem>
          </div>
        </div>

        <div className="card">
          <div className="card-title-row">
            <Briefcase size={18} />
            <h3 className="card-title">Employment Details</h3>
          </div>
          <div className="detail-list">
            <DetailItem icon={Building2} label="Department">{employee.department?.name}</DetailItem>
            <DetailItem icon={Briefcase} label="Designation">{employee.designation?.title}</DetailItem>
            <DetailItem icon={UserRound} label="Reporting Manager">{employee.manager?.name}</DetailItem>
            <DetailItem icon={BadgeCheck} label="Employment Type">{EMPLOYMENT_TYPE_LABELS[employee.employmentType]}</DetailItem>
            <DetailItem icon={CalendarPlus} label="Joining Date">{formatDate(employee.joiningDate)}</DetailItem>
            <DetailItem icon={ShieldCheck} label="Login Account">
              <span className="stack-sm" style={{ gap: '0.25rem' }}>
                <span>
                  <StatusBadge status={employee.user?.isActive === false ? 'inactive' : 'active'} />
                </span>
                <span className="text-xs text-muted">
                  Last login: {employee.user?.lastLoginAt ? formatDateTime(employee.user.lastLoginAt) : 'Never'}
                </span>
                {showAccountLink && employee.user?._id && (
                  <Link to={`/users/${employee.user._id}`} className="link text-xs">Manage account</Link>
                )}
              </span>
            </DetailItem>
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="card">
          <div className="card-title-row">
            <Wallet size={18} />
            <h3 className="card-title">Salary Structure</h3>
            <span className="card-subtitle">Monthly, INR</span>
          </div>
          <div className="detail-list">
            <DetailItem label="Basic">{formatCurrency(salary.basic ?? 0)}</DetailItem>
            <DetailItem label="House Rent Allowance">{formatCurrency(salary.hra ?? 0)}</DetailItem>
            <DetailItem label="Other Allowances">{formatCurrency(salary.allowances ?? 0)}</DetailItem>
            <DetailItem label="Deductions">{formatCurrency(salary.deductions ?? 0)}</DetailItem>
            <DetailItem label="Net Monthly Pay">
              <span className="text-success">{formatCurrency(employee.grossSalary ?? 0)}</span>
            </DetailItem>
          </div>
        </div>
      )}
    </div>
  );
}

export function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const canEdit = canEditOrganisation(user);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: employee, loading, error, reload } = useFetch((config) => employeesApi.get(id, config), [id]);

  const [uploadAvatar, uploadingAvatar] = useAction((file) => uploadApi.profile(file, employee.user._id), {
    success: 'Profile photo updated',
    error: 'Photo upload failed',
    onSuccess: (res) => {
      // Keep the navbar avatar in sync when HR/admin updates their own photo
      if (employee.user._id === user?._id) updateUser({ avatar: res.data.data });
      reload();
    },
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      toast.error('Invalid file', 'Choose a PNG, JPG or WEBP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Invalid file', 'Image must be smaller than 5MB');
      return;
    }
    uploadAvatar(file);
  };

  const header = (
    <PageHeader
      title="Employee Profile"
      subtitle={employee ? `${employeeName(employee)} · ${employee.employeeId}` : 'Employment record, activity and documents'}
    >
      <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/employees')}>
        Directory
      </Button>
      <Button variant="secondary" icon={CalendarClock} onClick={() => navigate(`/attendance/employee/${id}`)}>
        Attendance Log
      </Button>
      {canEdit && (
        <Button icon={Pencil} onClick={() => navigate(`/employees/${id}/edit`)}>
          Edit
        </Button>
      )}
    </PageHeader>
  );

  // Keep showing the profile while it refreshes (e.g. after an upload), but not a previous employee's
  const current = employee?._id === id ? employee : null;
  if (error && !current) {
    return <div>{header}<LoadError message={error} onRetry={reload} /></div>;
  }
  if (!current) {
    return <div>{header}<Loader /></div>;
  }

  const name = employeeName(employee);

  return (
    <div>
      {header}

      <div className="card section-gap">
        <div className="profile-header">
          <div className="avatar-edit">
            <Avatar key={employee.user?.avatar?.url} name={name} src={employee.user?.avatar?.url} size={72} />
            {canEdit && employee.user?._id && (
              <label className="avatar-edit-btn" title="Change profile photo" aria-busy={uploadingAvatar || undefined}>
                <input type="file" accept={AVATAR_TYPES.join(',')} disabled={uploadingAvatar} onChange={handleAvatarChange} />
                {uploadingAvatar ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Camera size={14} />}
                <span className="sr-only">Change profile photo</span>
              </label>
            )}
          </div>
          <div className="profile-header-body">
            <div className="row">
              <h2 className="profile-name">{name}</h2>
              <StatusBadge status={employee.status} label={EMPLOYEE_STATUS_LABELS[employee.status]} />
            </div>
            <p className="text-sm text-muted">
              <span className="text-bold">{employee.employeeId}</span>
              {' · '}{employee.department?.name || 'No department'}
              {' · '}{employee.designation?.title || 'No designation'}
            </p>
          </div>
        </div>
      </div>

      <div className="tab-list" role="tablist" aria-label="Employee sections">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            className={`tab-btn ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Each tab mounts only when active, so its data loads lazily */}
      {activeTab === 'overview' && <OverviewTab employee={employee} canEdit={canEdit} showAccountLink={isAdmin(user)} />}
      {activeTab === 'attendance' && <AttendanceTab employeeId={employee._id} />}
      {activeTab === 'leaves' && <LeavesTab userId={employee.user?._id} />}
      {activeTab === 'tasks' && <TasksTab userId={employee.user?._id} />}
      {activeTab === 'documents' && (
        <DocumentsTab employee={employee} canEdit={canEdit} onRefresh={reload} refreshing={loading} />
      )}
    </div>
  );
}
