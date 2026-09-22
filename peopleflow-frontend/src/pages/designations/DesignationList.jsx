import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Briefcase, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { DataTable } from '../../components/common/Table';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { useAction } from '../../hooks/useAction';
import { useAuth } from '../../context/AuthContext';
import { departmentsApi, designationsApi } from '../../api/endpoints';
import { canEditOrganisation } from '../../utils/auth';
import { formatCurrency } from '../../utils/format';

const STATUS_OPTIONS = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }];

function salaryBand(range) {
  const min = range?.min || 0;
  const max = range?.max || 0;
  if (min && max) return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  if (max) return `Up to ${formatCurrency(max)}`;
  if (min) return `From ${formatCurrency(min)}`;
  return null;
}

export function DesignationList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = canEditOrganisation(user);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const { data: designations, loading, error, reload } = useFetch(
    (config) => designationsApi.list(department ? { department } : undefined, config),
    [department],
  );
  const { data: departments } = useFetch((config) => departmentsApi.list(config), []);

  const [deleteDesignation, deleting] = useAction((id) => designationsApi.remove(id), {
    success: 'Designation deleted',
    error: 'Could not delete designation',
    onSuccess: () => {
      setPendingDelete(null);
      reload();
    },
  });

  // The endpoint is not paginated, so search and status filter locally
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (designations || []).filter((d) => {
      if (status === 'active' && d.isActive === false) return false;
      if (status === 'inactive' && d.isActive !== false) return false;
      if (!term) return true;
      return [d.title, d.description, d.department?.name].some((v) => v?.toLowerCase().includes(term));
    });
  }, [designations, search, status]);

  const hasFilters = Boolean(search || department || status);

  const columns = [
    {
      key: 'title',
      header: 'Designation',
      lead: true,
      render: (d) => (
        <div>
          <div className="cell-primary">{d.title}</div>
          {d.description && <div className="cell-secondary truncate">{d.description}</div>}
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (d) => d.department?.name || <span className="text-muted">All departments</span>,
    },
    {
      key: 'salaryRange',
      header: 'Monthly Salary Band',
      render: (d) => <span className="nowrap">{salaryBand(d.salaryRange) || '—'}</span>,
    },
    { key: 'employeeCount', header: 'Employees', render: (d) => d.employeeCount ?? 0 },
    { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.isActive === false ? 'inactive' : 'active'} /> },
  ];

  if (canEdit) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (d) => (
        <div className="table-actions">
          <Button variant="ghost" size="sm" className="btn-icon" icon={Pencil} aria-label={`Edit ${d.title}`} onClick={() => navigate(`/designations/${d._id}/edit`)} />
          <Button variant="ghost" size="sm" className="btn-icon" icon={Trash2} aria-label={`Delete ${d.title}`} onClick={() => setPendingDelete(d)} />
        </div>
      ),
    });
  }

  return (
    <div>
      <PageHeader title="Designations" subtitle="Job titles, the departments they belong to and salary bands">
        {canEdit && (
          <Button icon={Plus} onClick={() => navigate('/designations/add')}>
            Add Designation
          </Button>
        )}
      </PageHeader>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="toolbar-search">
            <Input
              compact
              type="search"
              placeholder="Search designations…"
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search designations"
            />
          </div>
          <div className="toolbar-filters">
            <Select
              compact
              placeholder="All Departments"
              options={(departments || []).map((d) => ({ value: d._id, label: d.name }))}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
            <Select compact placeholder="All Statuses" options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  setSearch('');
                  setDepartment('');
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
          onRowClick={canEdit ? (d) => navigate(`/designations/${d._id}/edit`) : undefined}
          empty={hasFilters ? {
            icon: Search,
            title: 'No matching designations',
            description: 'Try a different search term or clear the filters.',
          } : {
            icon: Briefcase,
            title: 'No designations yet',
            description: 'Create job titles so employees can be assigned to roles.',
            actionLabel: canEdit ? 'Add Designation' : undefined,
            actionIcon: Plus,
            onAction: () => navigate('/designations/add'),
          }}
        />
      </div>

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete Designation"
        confirmLabel="Delete"
        variant="danger"
        confirmLoading={deleting}
        onConfirm={() => deleteDesignation(pendingDelete._id)}
      >
        <div className="stack-sm">
          <p>
            Permanently delete the <strong>{pendingDelete?.title}</strong> designation? This cannot be undone.
          </p>
          {pendingDelete?.employeeCount > 0 && (
            <Alert type="warning" style={{ marginBottom: 0 }}>
              {pendingDelete.employeeCount} employee{pendingDelete.employeeCount === 1 ? ' holds' : 's hold'} this designation.
              Reassign them first.
            </Alert>
          )}
        </div>
      </Modal>
    </div>
  );
}
