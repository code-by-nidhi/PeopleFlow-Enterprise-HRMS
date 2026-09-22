import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Loader, LoadError, Alert } from '../../components/common/Feedback';
import { DesignationForm } from './DesignationForm';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { designationsApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';

export function EditDesignation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: designation, loading, error, reload } = useFetch((config) => designationsApi.get(id, config), [id]);

  const handleSubmit = async (payload) => {
    try {
      await designationsApi.update(id, payload);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
    toast.success('Designation updated', payload.title);
    navigate('/designations', { replace: true });
  };

  const count = designation?.employeeCount || 0;

  return (
    <div>
      <PageHeader
        title="Edit Designation"
        subtitle={designation ? `${designation.title} · ${designation.department?.name || 'All departments'}` : 'Update designation details'}
      >
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/designations')}>
          Back to Designations
        </Button>
      </PageHeader>

      {loading ? (
        <Loader />
      ) : error ? (
        <LoadError message={error} onRetry={reload} />
      ) : (
        <>
          {count > 0 && (
            <div className="max-w-md">
              <Alert type="info">
                {count} employee{count === 1 ? ' holds' : 's hold'} this designation. Changes apply to their records too.
              </Alert>
            </div>
          )}
          <DesignationForm designation={designation} onSubmit={handleSubmit} submitLabel="Save Changes" />
        </>
      )}
    </div>
  );
}
