import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Trash2, UserX, UserCheck, Mail, ShieldCheck, Clock, CalendarDays, KeyRound,
  IdCard, Building2, Briefcase, Activity, ExternalLink, UserCog,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { Alert, Loader, LoadError, DetailItem } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { useAction } from '../../hooks/useAction';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../api/endpoints';
import { ROLE_LABELS, ROLES } from '../../utils/constants';
import { formatDate, formatDateTime } from '../../utils/format';

export function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [confirm, setConfirm] = useState(null); // 'status' | 'delete' | null

  const { data, loading, error, reload } = useFetch((config) => usersApi.get(id, config), [id]);
  const account = data?.user;
  const employee = data?.employee;
  const isSelf = account?._id === authUser?._id;

  const [toggleStatus, togglingStatus] = useAction((isActive) => usersApi.setStatus(id, isActive), {
    success: (res) => res.data.message || 'User status updated',
    error: 'Could not update status',
    onSuccess: () => {
      setConfirm(null);
      reload();
    },
  });

  const [deleteUser, deleting] = useAction(() => usersApi.remove(id), {
    success: 'User deleted',
    error: 'Could not delete user',
    onSuccess: () => navigate('/users', { replace: true }),
  });

  const header = (
    <PageHeader title="User Account" subtitle={account ? account.email : 'Login account details'}>
      <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/users')}>
        Back to Users
      </Button>
      {account && (
        <>
          <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/users/${id}/edit`)}>
            Edit
          </Button>
          <Button
            variant={account.isActive ? 'secondary' : 'success'}
            icon={account.isActive ? UserX : UserCheck}
            disabled={isSelf}
            title={isSelf ? 'You cannot change your own status' : undefined}
            onClick={() => setConfirm('status')}
          >
            {account.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="danger"
            icon={Trash2}
            disabled={isSelf}
            title={isSelf ? 'You cannot delete your own account' : undefined}
            onClick={() => setConfirm('delete')}
          >
            Delete
          </Button>
        </>
      )}
    </PageHeader>
  );

  if (loading && !account) {
    return <div>{header}<Loader /></div>;
  }
  if (error && !account) {
    return <div>{header}<LoadError message={error} onRetry={reload} /></div>;
  }

  return (
    <div>
      {header}

      {isSelf && <Alert type="info">This is your own account. You cannot deactivate it, delete it or change its role.</Alert>}

      <div className="card section-gap">
        <div className="profile-header">
          <Avatar name={account.name} src={account.avatar?.url} size={64} />
          <div className="profile-header-body">
            <div className="row">
              <h2 className="profile-name">{account.name}</h2>
              <StatusBadge status={account.isActive ? 'active' : 'inactive'} />
            </div>
            <p className="text-sm text-muted">
              {ROLE_LABELS[account.role] || account.role} · {account.email}
            </p>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title-row">
            <ShieldCheck size={18} />
            <h3 className="card-title">Account Information</h3>
          </div>
          <div className="detail-list">
            <DetailItem icon={Mail} label="Email">{account.email}</DetailItem>
            <DetailItem icon={UserCog} label="Role">
              <StatusBadge tone="info" label={ROLE_LABELS[account.role] || account.role} />
            </DetailItem>
            <DetailItem icon={Activity} label="Status">
              <StatusBadge status={account.isActive ? 'active' : 'inactive'} />
            </DetailItem>
            <DetailItem icon={KeyRound} label="Password">
              {account.mustChangePassword ? <span className="text-warning">Password change pending</span> : 'Set by user'}
            </DetailItem>
            <DetailItem icon={Clock} label="Last Login">
              {account.lastLoginAt ? formatDateTime(account.lastLoginAt) : 'Never signed in'}
            </DetailItem>
            <DetailItem icon={CalendarDays} label="Created">{formatDate(account.createdAt)}</DetailItem>
          </div>
        </div>

        <div className="card">
          <div className="card-title-row">
            <IdCard size={18} />
            <h3 className="card-title">Employee Profile</h3>
          </div>
          {employee ? (
            <div className="stack">
              <div className="detail-list">
                <DetailItem icon={IdCard} label="Employee ID">{employee.employeeId}</DetailItem>
                <DetailItem icon={Activity} label="Employment Status">
                  {employee.status ? <StatusBadge status={employee.status} /> : null}
                </DetailItem>
                <DetailItem icon={Building2} label="Department">{employee.department?.name}</DetailItem>
                <DetailItem icon={Briefcase} label="Designation">{employee.designation?.title}</DetailItem>
              </div>
              <div>
                <Button variant="secondary" size="sm" icon={ExternalLink} onClick={() => navigate(`/employees/${employee._id}`)}>
                  View Employee Profile
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              compact
              icon={IdCard}
              title="No employee profile"
              description={account.role === ROLES.EMPLOYEE
                ? 'This employee account has no linked profile.'
                : 'This is a management login account without an employee record.'}
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={confirm === 'status'}
        onClose={() => setConfirm(null)}
        title={account.isActive ? 'Deactivate User' : 'Activate User'}
        confirmLabel={account.isActive ? 'Deactivate' : 'Activate'}
        variant={account.isActive ? 'danger' : 'success'}
        confirmLoading={togglingStatus}
        onConfirm={() => toggleStatus(!account.isActive)}
      >
        <p>
          {account.isActive ? (
            <>
              Deactivate <strong>{account.name}</strong>? They will be signed out and unable to log in
              {employee ? ', and their employee status will be set to inactive' : ''}.
            </>
          ) : (
            <>
              Activate <strong>{account.name}</strong>? They will be able to log in again
              {employee ? ', and their employee status will be set to active' : ''}.
            </>
          )}
        </p>
      </Modal>

      <Modal
        isOpen={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        title="Delete User"
        confirmLabel="Delete"
        variant="danger"
        confirmLoading={deleting}
        onConfirm={() => deleteUser()}
      >
        <p>
          Permanently delete <strong>{account.name}</strong> ({account.email})?
          {employee
            ? ' Their employee profile, attendance, leave history and tasks will also be removed.'
            : ' Their login and related records will be removed.'}
          {' '}This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
