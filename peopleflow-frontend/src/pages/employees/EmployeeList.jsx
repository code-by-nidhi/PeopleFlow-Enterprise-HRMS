import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Users, Eye, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { DataTable } from '../../components/common/Table';
import { Pagination } from '../../components/common/Pagination';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PersonCell } from '../../components/common/Avatar';
import { Modal } from '../../components/common/Modal';
import { useFetch } from '../../hooks/useFetch';
import { useListQuery } from '../../hooks/useListQuery';
import { useAction } from '../../hooks/useAction';
import { useAuth } from '../../context/AuthContext';
import { employeesApi, departmentsApi, designationsApi } from '../../api/endpoints';
import { EMPLOYEE_STATUS_LABELS, toOptions } from '../../utils/constants';
import { canEditOrganisation, isAdmin } from '../../utils/auth';
import { employeeName, formatDate } from '../../utils/format';

export function EmployeeList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [pendingDelete, setPendingDelete] = useState(null);
  const canEdit = canEditOrganisation(user);

  const { filters, setFilter, search, setSearch, setPage, params, paramsKey, resetFilters } = useListQuery({
    department: '',
    designation: '',
    status: '',
  });

  // Navbar search lands here with ?q=
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setSearch(q);
  }, [searchParams, setSearch]);

  const { data: employees, meta, loading, error, reload } = useFetch((config) => employeesApi.list(params, config), [paramsKey]);
  const { data: departments } = useFetch((config) => departmentsApi.list(config), []);
  const { data: designations } = useFetch(
    (config) => designationsApi.list(filters.department ? { department: filters.department } : undefined, config),
    [filters.department],
  );

  const [deleteEmployee, deleting] = useAction((id) => employeesApi.remove(id), {
    success: 'Employee deleted',
    onSuccess: () => {
      setPendingDelete(null);
      reload();
    },
  });

  const hasFilters = search || Object.values(filters).some(Boolean);

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      lead: true,
      render: (e) => <PersonCell name={employeeName(e)} subtitle={e.user?.email} avatar={e.user?.avatar?.url} />,
    },
    { key: 'employeeId', header: 'Employee ID', render: (e) => <span className="text-bold nowrap">{e.employeeId}</span> },
    { key: 'department', header: 'Department', render: (e) => e.department?.name || '—' },
    { key: 'designation', header: 'Designation', render: (e) => e.designation?.title || '—' },
    { key: 'status', header: 'Status', render: (e) => <StatusBadge status={e.status} /> },
    { key: 'joiningDate', header: 'Joined', render: (e) => <span className="nowrap">{formatDate(e.joiningDate)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (e) => (
        <div className="table-actions">
          <Button variant="ghost" size="sm" className="btn-icon" icon={Eye} aria-label="View employee" onClick={() => navigate(`/employees/${e._id}`)} />
          {canEdit && (
            <Button variant="ghost" size="sm" className="btn-icon" icon={Pencil} aria-label="Edit employee" onClick={() => navigate(`/employees/${e._id}/edit`)} />
          )}
          {isAdmin(user) && (
            <Button variant="ghost" size="sm" className="btn-icon" icon={Trash2} aria-label="Delete employee" onClick={() => setPendingDelete(e)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Employee Directory" subtitle="Manage company staff, employment records and roles">
        {canEdit && (
          <Button icon={Plus} onClick={() => navigate('/employees/add')}>
            Add Employee
          </Button>
        )}
      </PageHeader>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="toolbar-search">
            <Input
              compact
              type="search"
              placeholder="Search by name, ID or email…"
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search employees"
            />
          </div>

          <div className="toolbar-filters">
            <Select
              compact
              placeholder="All Departments"
              options={(departments || []).map((d) => ({ value: d._id, label: d.name }))}
              value={filters.department}
              onChange={(e) => {
                setFilter('department', e.target.value);
                setFilter('designation', '');
              }}
            />
            <Select
              compact
              placeholder="All Designations"
              options={(designations || []).map((d) => ({ value: d._id, label: d.title }))}
              value={filters.designation}
              onChange={(e) => setFilter('designation', e.target.value)}
            />
            <Select
              compact
              placeholder="All Statuses"
              options={toOptions(EMPLOYEE_STATUS_LABELS)}
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
          rows={employees || []}
          loading={loading}
          error={error}
          onRetry={reload}
          onRowClick={(e) => navigate(`/employees/${e._id}`)}
          empty={hasFilters ? {
            icon: Search,
            title: 'No matching employees',
            description: 'Try a different search term or clear the filters.',
          } : {
            icon: Users,
            title: 'No employees yet',
            description: 'Add your first employee to get started.',
            actionLabel: canEdit ? 'Add Employee' : undefined,
            actionIcon: Plus,
            onAction: () => navigate('/employees/add'),
          }}
        />

        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete Employee"
        confirmLabel="Delete"
        variant="danger"
        confirmLoading={deleting}
        onConfirm={() => deleteEmployee(pendingDelete._id)}
      >
        <p>
          Permanently delete <strong>{employeeName(pendingDelete)}</strong> ({pendingDelete?.employeeId})? Their login account,
          attendance, leave history, tasks and documents will also be removed. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
