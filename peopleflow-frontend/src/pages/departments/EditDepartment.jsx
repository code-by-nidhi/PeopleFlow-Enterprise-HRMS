import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Briefcase, CalendarDays } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Loader, LoadError, DetailItem } from '../../components/common/Feedback';
import { DepartmentForm } from './DepartmentForm';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { departmentsApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';
import { formatDate } from '../../utils/format';

export function EditDepartment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: department, loading, error, reload } = useFetch((config) => departmentsApi.get(id, config), [id]);

  const handleSubmit = async (payload) => {
    try {
      await departmentsApi.update(id, payload);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
    toast.success('Department updated', payload.name);
    navigate('/departments', { replace: true });
  };

  return (
    <div>
      <PageHeader title="Edit Department" subtitle={department ? department.name : 'Update department details'}>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/departments')}>
          Back to Departments
        </Button>
      </PageHeader>

      {loading ? (
        <Loader />
      ) : error ? (
        <LoadError message={error} onRetry={reload} />
      ) : (
        <>
          <div className="card section-gap max-w-md">
            <div className="detail-list">
              <DetailItem icon={Users} label="Employees">{department.employeeCount ?? 0}</DetailItem>
              <DetailItem icon={Briefcase} label="Designations">
                {department.designations?.length ? department.designations.map((d) => d.title).join(', ') : 'None yet'}
              </DetailItem>
              <DetailItem icon={CalendarDays} label="Created">{formatDate(department.createdAt)}</DetailItem>
            </div>
          </div>

          <DepartmentForm department={department} onSubmit={handleSubmit} submitLabel="Save Changes" />
        </>
      )}
    </div>
  );
}
