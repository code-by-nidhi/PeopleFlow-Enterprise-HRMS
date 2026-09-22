import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, UserCog, Eye, Pencil, RotateCcw } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { DataTable } from '../../components/common/Table';
import { Pagination } from '../../components/common/Pagination';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PersonCell } from '../../components/common/Avatar';
import { useFetch } from '../../hooks/useFetch';
import { useListQuery } from '../../hooks/useListQuery';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../api/endpoints';
import { ROLE_LABELS, toOptions } from '../../utils/constants';
import { formatDate, relativeTime } from '../../utils/format';

const STATUS_OPTIONS = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }];

export function UserList() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const { filters, setFilter, search, setSearch, setPage, params, paramsKey, resetFilters } = useListQuery({
    role: '',
    status: '',
  });

  const { data: users, meta, loading, error, reload } = useFetch((config) => usersApi.list(params, config), [paramsKey]);

  const hasFilters = search || Object.values(filters).some(Boolean);

  const columns = [
    {
      key: 'user',
      header: 'User',
      lead: true,
      render: (u) => (
        <PersonCell
          name={u._id === authUser?._id ? `${u.name} (you)` : u.name}
          subtitle={u.email}
          avatar={u.avatar?.url}
        />
      ),
    },
    { key: 'role', header: 'Role', render: (u) => <StatusBadge tone="info" label={ROLE_LABELS[u.role] || u.role} /> },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <div>
          <StatusBadge status={u.isActive ? 'active' : 'inactive'} />
          {u.mustChangePassword && <div className="text-xs text-warning">Password change pending</div>}
        </div>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      render: (u) => <span className="nowrap">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : 'Never'}</span>,
    },
    { key: 'createdAt', header: 'Created', render: (u) => <span className="nowrap">{formatDate(u.createdAt)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (u) => (
        <div className="table-actions">
          <Button variant="ghost" size="sm" className="btn-icon" icon={Eye} aria-label={`View ${u.name}`} onClick={() => navigate(`/users/${u._id}`)} />
          <Button variant="ghost" size="sm" className="btn-icon" icon={Pencil} aria-label={`Edit ${u.name}`} onClick={() => navigate(`/users/${u._id}/edit`)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="User Accounts" subtitle="Manage portal logins, roles and access">
        <Button icon={Plus} onClick={() => navigate('/users/create')}>
          Create User
        </Button>
      </PageHeader>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="toolbar-search">
            <Input
              compact
              type="search"
              placeholder="Search by name or email…"
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search users"
            />
          </div>

          <div className="toolbar-filters">
            <Select
              compact
              placeholder="All Roles"
              options={toOptions(ROLE_LABELS)}
              value={filters.role}
              onChange={(e) => setFilter('role', e.target.value)}
            />
            <Select
              compact
              placeholder="All Statuses"
              options={STATUS_OPTIONS}
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
            />
            {hasFilters && (
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetFilters}>
                Reset
              </Button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={users || []}
          loading={loading}
          error={error}
          onRetry={reload}
          onRowClick={(u) => navigate(`/users/${u._id}`)}
          empty={hasFilters ? {
            icon: Search,
            title: 'No matching users',
            description: 'Try a different search term or clear the filters.',
          } : {
            icon: UserCog,
            title: 'No user accounts yet',
            description: 'Create login accounts for administrators, HR and managers.',
            actionLabel: 'Create User',
            actionIcon: Plus,
            onAction: () => navigate('/users/create'),
          }}
        />

        <Pagination meta={meta} onPageChange={setPage} />
      </div>
    </div>
  );
}
