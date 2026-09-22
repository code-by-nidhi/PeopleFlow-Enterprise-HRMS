import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { PersonCell } from '../../components/common/Avatar';
import { LoadError } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { useListQuery } from '../../hooks/useListQuery';
import { useAuth } from '../../context/AuthContext';
import { attendanceApi } from '../../api/endpoints';
import { ROLE_LABELS } from '../../utils/constants';
import { isManagement } from '../../utils/auth';
import { MonthSummaryStats } from './MonthSummaryStats';
import { AttendanceHistory } from './AttendanceHistory';
import { CorrectionDialog } from './CorrectionDialog';

export function EmployeeAttendance() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // `undefined` = closed, `null` = add a new record, object = correct that record
  const [editing, setEditing] = useState(undefined);
  const { filters, setFilter, setPage, params, paramsKey, resetFilters } = useListQuery({ from: '', to: '' });

  const { data: records, meta, loading, error, reload } = useFetch(
    (config) => attendanceApi.forEmployee(id, params, config),
    [id, paramsKey],
  );

  const person = meta?.user;
  const employee = meta?.employee;
  // The server applies each office's correction rules; nobody may correct their own records
  const canCorrect = isManagement(user) && person && person._id !== user?._id;
  const name = employee ? `${employee.firstName} ${employee.lastName}` : person?.name;
  const subtitle = [
    employee?.employeeId,
    employee?.department?.name,
    employee?.designation?.title,
  ].filter(Boolean).join(' · ') || (person ? `${person.email} · ${ROLE_LABELS[person.role] || person.role}` : 'Attendance history');

  const back = (
    <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/attendance')}>
      Back to Attendance
    </Button>
  );

  if (error && !meta) {
    return (
      <div>
        <PageHeader title="Employee Attendance" subtitle="Attendance history">{back}</PageHeader>
        <LoadError message={error} onRetry={reload} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={name ? `${name}’s Attendance` : 'Employee Attendance'} subtitle={subtitle}>
        {back}
      </PageHeader>

      {person && (
        <div className="card section-gap">
          <PersonCell
            size={48}
            name={name}
            avatar={person.avatar?.url}
            subtitle={`${person.email} · ${ROLE_LABELS[person.role] || person.role}`}
          />
        </div>
      )}

      <MonthSummaryStats summary={meta?.monthSummary} loading={loading} />

      <AttendanceHistory
        title="Attendance History"
        records={records}
        meta={meta}
        loading={loading}
        error={error}
        onRetry={reload}
        filters={filters}
        setFilter={setFilter}
        resetFilters={resetFilters}
        setPage={setPage}
        onCorrect={canCorrect ? setEditing : undefined}
        actions={canCorrect && (
          <Button variant="secondary" size="sm" icon={CalendarPlus} onClick={() => setEditing(null)}>
            Add Record
          </Button>
        )}
      />

      <CorrectionDialog
        isOpen={editing !== undefined}
        record={editing}
        userId={person?._id}
        onClose={() => setEditing(undefined)}
        onSaved={reload}
      />
    </div>
  );
}
