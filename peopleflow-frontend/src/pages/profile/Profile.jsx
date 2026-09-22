import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  Cake,
  CalendarDays,
  Camera,
  Clock,
  History,
  IdCard,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Alert, DetailItem, Loader, LoadError } from '../../components/common/Feedback';
import { useAction } from '../../hooks/useAction';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { uploadApi } from '../../api/endpoints';
import { EMPLOYMENT_TYPE_LABELS, GENDER_LABELS, LEAVE_TYPE_LABELS, ROLE_LABELS } from '../../utils/constants';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { ProfileSection } from './ProfileSection';
import { ProfileDocuments } from './ProfileDocuments';

const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const AVATAR_MAX_MB = 5;
const DEFAULT_LEAVE_BALANCE = { casual: 12, sick: 8, earned: 15 };

function LeaveBalanceCard({ balance = {} }) {
  return (
    <ProfileSection icon={CalendarDays} title="Leave balance" subtitle="Days remaining for the current year">
      <div className="stack">
        {Object.entries(DEFAULT_LEAVE_BALANCE).map(([type, total]) => {
          const left = Number(balance[type] ?? 0);
          const percent = Math.min(Math.max((left / total) * 100, 0), 100);
          const low = percent <= 25;
          return (
            <div key={type} className="stack-sm">
              <div className="row-between text-sm">
                <span className="text-bold">{LEAVE_TYPE_LABELS[type]}</span>
                <span className={low ? 'text-danger' : 'text-muted'}>
                  {left} {left === 1 ? 'day' : 'days'} left <span className="text-faint">of {total}</span>
                </span>
              </div>
              <div
                className="meter"
                role="progressbar"
                aria-label={`${LEAVE_TYPE_LABELS[type]} remaining`}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={left}
              >
                <span style={{ width: `${percent}%`, backgroundColor: low ? 'var(--danger)' : 'var(--accent)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </ProfileSection>
  );
}

function SalaryCard({ employee }) {
  const salary = employee.salary || {};
  const rows = [
    { label: 'Basic', value: salary.basic },
    { label: 'HRA', value: salary.hra },
    { label: 'Allowances', value: salary.allowances },
    { label: 'Deductions', value: salary.deductions, negative: true },
  ];

  return (
    <ProfileSection icon={Wallet} title="My salary" subtitle="Monthly salary structure">
      <div className="stack-sm text-sm">
        {rows.map((row) => (
          <div key={row.label} className="row-between">
            <span className="text-muted">{row.label}</span>
            <span className={row.negative && row.value ? 'text-danger' : undefined}>
              {row.negative && row.value ? '− ' : ''}{formatCurrency(row.value ?? 0)}
            </span>
          </div>
        ))}
        <div className="row-between text-bold" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
          <span>Net pay</span>
          <span>{formatCurrency(employee.grossSalary ?? 0)}</span>
        </div>
      </div>
    </ProfileSection>
  );
}

export function Profile() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, employee, refreshProfile, updateUser } = useAuth();
  // 'loading' until the first profile refresh finishes; 'error' if it failed with nothing cached
  const [status, setStatus] = useState('loading');

  const loadProfile = async () => {
    setStatus('loading');
    const result = await refreshProfile();
    setStatus(result ? 'ready' : 'error');
  };

  useEffect(() => {
    let active = true;
    refreshProfile().then((result) => {
      if (active) setStatus(result ? 'ready' : 'error');
    });
    return () => {
      active = false;
    };
  }, [refreshProfile]);

  const [uploadAvatar, uploadingAvatar] = useAction((file) => uploadApi.profile(file), {
    success: 'Profile photo updated',
    error: 'Photo upload failed',
    onSuccess: (res) => updateUser({ avatar: res.data.data }),
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      toast.error('File not accepted', 'Choose a PNG, JPG or WEBP image.');
      return;
    }
    if (file.size > AVATAR_MAX_MB * 1024 * 1024) {
      toast.error('File not accepted', `Image must be smaller than ${AVATAR_MAX_MB}MB.`);
      return;
    }
    uploadAvatar(file);
  };

  if (!user) return <Loader label="Loading profile…" />;

  const displayName = employee?.fullName || user.name;
  const settled = Boolean(employee) || status !== 'loading';

  let details;
  if (employee) {
    details = (
      <>
        <div className="grid-2">
          <ProfileSection icon={User} title="Personal details" subtitle="Contact HR to update your personal or employment details.">
            <div className="detail-list">
              <DetailItem icon={Mail} label="Email">{user.email}</DetailItem>
              <DetailItem icon={Phone} label="Phone">{employee.phone || undefined}</DetailItem>
              <DetailItem icon={User} label="Gender">{GENDER_LABELS[employee.gender]}</DetailItem>
              <DetailItem icon={Cake} label="Date of birth">
                {employee.dateOfBirth ? formatDate(employee.dateOfBirth) : undefined}
              </DetailItem>
              <DetailItem icon={MapPin} label="Address">{employee.address || undefined}</DetailItem>
            </div>
          </ProfileSection>

          <ProfileSection icon={Briefcase} title="Employment" subtitle="Your role within the organisation">
            <div className="detail-list">
              <DetailItem icon={IdCard} label="Employee ID">{employee.employeeId}</DetailItem>
              <DetailItem icon={Building2} label="Department">{employee.department?.name}</DetailItem>
              <DetailItem icon={Briefcase} label="Designation">{employee.designation?.title}</DetailItem>
              <DetailItem icon={UserCheck} label="Reporting manager">
                {employee.manager ? (
                  <>
                    {employee.manager.name}
                    {employee.manager.email && <span className="text-xs text-muted" style={{ display: 'block', fontWeight: 400 }}>{employee.manager.email}</span>}
                  </>
                ) : undefined}
              </DetailItem>
              <DetailItem icon={Clock} label="Employment type">{EMPLOYMENT_TYPE_LABELS[employee.employmentType]}</DetailItem>
              <DetailItem icon={CalendarDays} label="Joining date">
                {employee.joiningDate ? formatDate(employee.joiningDate) : undefined}
              </DetailItem>
            </div>
          </ProfileSection>
        </div>

        <div className="grid-2">
          <LeaveBalanceCard balance={user.leaveBalance} />
          <SalaryCard employee={employee} />
        </div>

        <div className="grid-2">
          <ProfileDocuments employee={employee} refreshProfile={refreshProfile} />
        </div>
      </>
    );
  } else if (!settled) {
    details = <Loader label="Loading profile details…" />;
  } else if (status === 'error') {
    details = <LoadError message="Your profile details could not be loaded." onRetry={loadProfile} />;
  } else {
    details = (
      <div className="max-w-md stack">
        <Alert type="info">
          HR and employment details don&apos;t apply to this account because it isn&apos;t linked to an employee profile.
        </Alert>
        <ProfileSection icon={ShieldCheck} title="Account" subtitle="Your PeopleFlow login">
          <div className="detail-list">
            <DetailItem icon={ShieldCheck} label="Role">{ROLE_LABELS[user.role] || user.role}</DetailItem>
            <DetailItem icon={Mail} label="Email">{user.email}</DetailItem>
            <DetailItem icon={CalendarDays} label="Member since">{formatDate(user.createdAt)}</DetailItem>
            <DetailItem icon={History} label="Last login">{formatDateTime(user.lastLoginAt)}</DetailItem>
          </div>
        </ProfileSection>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your personal, employment and account information">
        <Button variant="secondary" icon={KeyRound} onClick={() => navigate('/change-password')}>
          Change Password
        </Button>
      </PageHeader>

      <div className="stack">
        <section className="card profile-header">
          <div className="avatar-edit">
            <Avatar key={user.avatar?.url || 'none'} name={displayName} src={user.avatar?.url} size={80} />
            <label
              className="avatar-edit-btn"
              title="Change profile photo"
              aria-label="Change profile photo"
              style={uploadingAvatar ? { pointerEvents: 'none' } : undefined}
            >
              {uploadingAvatar ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Camera size={14} />}
              <input type="file" accept={AVATAR_TYPES.join(',')} onChange={handleAvatarChange} disabled={uploadingAvatar} />
            </label>
          </div>
          <div className="profile-header-body stack-sm">
            <div className="row">
              <h2 className="profile-name">{displayName}</h2>
              <span className="badge badge-neutral">{ROLE_LABELS[user.role] || user.role}</span>
            </div>
            <div className="row text-sm text-muted">
              <span className="row" style={{ gap: '0.35rem', flexWrap: 'nowrap', minWidth: 0, maxWidth: '100%' }}>
                <Mail size={14} />
                <span className="truncate">{user.email}</span>
              </span>
              {employee && (
                <>
                  <span className="row" style={{ gap: '0.35rem' }}>
                    <IdCard size={14} />
                    <span className="text-bold">{employee.employeeId}</span>
                  </span>
                  <StatusBadge status={employee.status} />
                </>
              )}
            </div>
          </div>
        </section>

        {details}
      </div>
    </div>
  );
}
