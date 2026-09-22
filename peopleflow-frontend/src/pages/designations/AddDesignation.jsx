import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { DesignationForm } from './DesignationForm';
import { designationsApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export function AddDesignation() {
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (payload) => {
    try {
      await designationsApi.create(payload);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
    toast.success('Designation created', payload.title);
    navigate('/designations', { replace: true });
  };

  return (
    <div>
      <PageHeader title="Add Designation" subtitle="Define a job title and its salary band">
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/designations')}>
          Back to Designations
        </Button>
      </PageHeader>

      <DesignationForm onSubmit={handleSubmit} submitLabel="Create Designation" />
    </div>
  );
}
