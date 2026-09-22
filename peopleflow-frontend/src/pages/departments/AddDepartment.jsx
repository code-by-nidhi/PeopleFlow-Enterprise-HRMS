import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { DepartmentForm } from './DepartmentForm';
import { departmentsApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export function AddDepartment() {
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (payload) => {
    try {
      await departmentsApi.create(payload);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
    toast.success('Department created', payload.name);
    navigate('/departments', { replace: true });
  };

  return (
    <div>
      <PageHeader title="Add Department" subtitle="Create a new division in your organisation">
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/departments')}>
          Back to Departments
        </Button>
      </PageHeader>

      <DepartmentForm onSubmit={handleSubmit} submitLabel="Create Department" />
    </div>
  );
}
