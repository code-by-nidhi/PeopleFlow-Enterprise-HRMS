import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Loader, LoadError } from '../../components/common/Feedback';
import { EmployeeForm, employeeToForm } from './EmployeeForm';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { employeesApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';
import { employeeName } from '../../utils/format';

export function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: employee, loading, error, reload } = useFetch((config) => employeesApi.get(id, config), [id]);

  const handleSubmit = async (payload) => {
    try {
      await employeesApi.update(id, payload);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
    toast.success('Employee updated');
    navigate(`/employees/${id}`, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Edit Employee"
        subtitle={employee ? `${employeeName(employee)} · ${employee.employeeId}` : 'Update employment record'}
      >
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(`/employees/${id}`)}>
          Back to Profile
        </Button>
      </PageHeader>

      {loading ? (
        <Loader />
      ) : error ? (
        <LoadError message={error} onRetry={reload} />
      ) : (
        <EmployeeForm isEdit initialValues={employeeToForm(employee)} onSubmit={handleSubmit} submitLabel="Save Changes" />
      )}
    </div>
  );
}
