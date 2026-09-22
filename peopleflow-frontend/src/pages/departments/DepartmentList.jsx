import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, Users, Briefcase, CheckCircle2, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { DataTable } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PersonCell } from '../../components/common/Avatar';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { useAction } from '../../hooks/useAction';
import { useAuth } from '../../context/AuthContext';
import { departmentsApi } from '../../api/endpoints';
import { canEditOrganisation } from '../../utils/auth';

const STATUS_OPTIONS = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }];

export function DepartmentList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = canEditOrganisation(user);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const { data: departments, loading, error, reload } = useFetch((config) => departmentsApi.list(config), []);

  const [deleteDepartment, deleting] = useAction((id) => departmentsApi.remove(id), {
    success: 'Department deleted',
    error: 'Could not delete department',
    onSuccess: () => {
      setPendingDelete(null);
      reload();
    },
  });

  // The endpoint is not paginated, so search and filter locally
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (departments || []).filter((d) => {
      if (status === 'active' && d.isActive === false) return false;
      if (status === 'inactive' && d.isActive !== false) return false;
      if (!term) return true;
      return [d.name, d.description, d.head?.name].some((v) => v?.toLowerCase().includes(term));
    });
  }, [departments, search, status]);

  const stats = useMemo(() => {
    const list = departments || [];
    return {
      total: list.length,
      active: list.filter((d) => d.isActive !== false).length,
      employees: list.reduce((sum, d) => sum + (d.employeeCount || 0), 0),
      designations: list.reduce((sum, d) => sum + (d.designationCount || 0), 0),
    };
  }, [departments]);

  const hasFilters = Boolean(search || status);
  const statsLoading = loading && !departments;

  const columns = [
    {
      key: 'name',
      header: 'Department',
      lead: true,
      render: (d) => (
        <div>
          <div className="cell-primary">{d.name}</div>
          {d.description && <div className="cell-secondary truncate">{d.description}</div>}
        </div>
      ),
    },
    {
      key: 'head',
      header: 'Head',
      render: (d) => (d.head ? <PersonCell name={d.head.name} subtitle={d.head.email} size={32} /> : <span className="text-muted">Not assigned</span>),
    },
    { key: 'employeeCount', header: 'Employees', render: (d) => d.employeeCount ?? 0 },
    { key: 'designationCount', header: 'Designations', render: (d) => d.designationCount ?? 0 },
    { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.isActive === false ? 'inactive' : 'active'} /> },
  ];

  if (canEdit) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (d) => (
        <div className="table-actions">
          <Button variant="ghost" size="sm" className="btn-icon" icon={Pencil} aria-label={`Edit ${d.name}`} onClick={() => navigate(`/departments/${d._id}/edit`)} />
          <Button variant="ghost" size="sm" className="btn-icon" icon={Trash2} aria-label={`Delete ${d.name}`} onClick={() => setPendingDelete(d)} />
        </div>
      ),
    });
  }

  return (
    <div>
      <PageHeader title="Departments" subtitle="Organisation structure, department heads and headcount">
        {canEdit && (
          <Button icon={Plus} onClick={() => navigate('/departments/add')}>
            Add Department
          </Button>
        )}
      </PageHeader>

      <div className="stats-grid">
        <StatCard label="Departments" value={stats.total} icon={Building2} loading={statsLoading} />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} loading={statsLoading} />
        <StatCard label="Employees" value={stats.employees} icon={Users} loading={statsLoading} />
        <StatCard label="Designations" value={stats.designations} icon={Briefcase} loading={statsLoading} />
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="toolbar-search">
            <Input
              compact
              type="search"
              placeholder="Search by name, description or head…"
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search departments"
            />
          </div>
          <div className="toolbar-filters">
            <Select compact placeholder="All Statuses" options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  setSearch('');
                  setStatus('');
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          onRowClick={canEdit ? (d) => navigate(`/departments/${d._id}/edit`) : undefined}
          empty={hasFilters ? {
            icon: Search,
            title: 'No matching departments',
            description: 'Try a different search term or clear the filters.',
          } : {
            icon: Building2,
            title: 'No departments yet',
            description: 'Create departments to organise employees into teams.',
            actionLabel: canEdit ? 'Add Department' : undefined,
            actionIcon: Plus,
            onAction: () => navigate('/departments/add'),
          }}
        />
      </div>

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete Department"
        confirmLabel="Delete"
        variant="danger"
        confirmLoading={deleting}
        onConfirm={() => deleteDepartment(pendingDelete._id)}
      >
        <div className="stack-sm">
          <p>
            Permanently delete the <strong>{pendingDelete?.name}</strong> department? This cannot be undone.
          </p>
          {pendingDelete?.employeeCount > 0 && (
            <Alert type="warning" style={{ marginBottom: 0 }}>
              {pendingDelete.employeeCount} employee{pendingDelete.employeeCount === 1 ? ' is' : 's are'} still assigned.
              Move them to another department first.
            </Alert>
          )}
        </div>
      </Modal>
    </div>
  );
}
