import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Loader, LoadError } from '../../components/common/Feedback';
import { UserForm } from './UserForm';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usersApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';

export function EditUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user: authUser, updateUser } = useAuth();
  const { data, loading, error, reload } = useFetch((config) => usersApi.get(id, config), [id]);
  const account = data?.user;

  const handleSubmit = async (payload) => {
    try {
      await usersApi.update(id, payload);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
    // Keep the navbar in sync when editing your own account
    if (id === authUser?._id) updateUser({ name: payload.name, email: payload.email });
    toast.success('User updated', payload.name);
    navigate(`/users/${id}`, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Edit User" subtitle={account ? `${account.name} · ${account.email}` : 'Update login account'}>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(`/users/${id}`)}>
          Back to User
        </Button>
      </PageHeader>

      {loading ? (
        <Loader />
      ) : error ? (
        <LoadError message={error} onRetry={reload} />
      ) : (
        <UserForm account={account} hasEmployeeProfile={Boolean(data.employee)} onSubmit={handleSubmit} submitLabel="Save Changes" />
      )}
    </div>
  );
}
