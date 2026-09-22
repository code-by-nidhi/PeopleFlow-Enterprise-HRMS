import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { UserForm } from './UserForm';
import { usersApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { isAdmin } from '../../utils/auth';

export function CreateUser() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user: authUser } = useAuth();
  const admin = isAdmin(authUser);
  const [credentials, setCredentials] = useState(null);

  // HR has no access to /users, so they return to the dashboard
  const destination = (id) => (admin ? `/users/${id}` : '/dashboard');
  const backTo = admin ? '/users' : '/dashboard';

  const handleSubmit = async (payload) => {
    let result;
    try {
      const res = await usersApi.create(payload);
      result = res.data.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }

    const { user, temporaryPassword } = result;
    if (temporaryPassword) {
      // Email is not configured on the server, so the password must be shared manually
      toast.success('User created', user.name);
      setCredentials({ email: user.email, password: temporaryPassword, id: user._id });
    } else {
      toast.success('User created', `Login credentials were emailed to ${user.email}`);
      navigate(destination(user._id), { replace: true });
    }
  };

  const finish = () => navigate(destination(credentials.id), { replace: true });

  return (
    <div>
      <PageHeader title="Create User" subtitle="Add a login account for an administrator, HR member or manager">
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(backTo)}>
          {admin ? 'Back to Users' : 'Back'}
        </Button>
      </PageHeader>

      <UserForm onSubmit={handleSubmit} submitLabel="Create User" />

      <Modal
        isOpen={Boolean(credentials)}
        onClose={finish}
        title="Share login credentials"
        footer={<Button onClick={finish}>{admin ? 'View User' : 'Done'}</Button>}
      >
        <p style={{ marginBottom: '1rem' }}>
          Email delivery is not configured, so share this temporary password with the user securely.
          They will be asked to change it at first login.
        </p>
        <div className="list-item">
          <div className="list-item-body">
            <span className="list-item-meta">{credentials?.email}</span>
            <span className="list-item-title" style={{ fontFamily: 'monospace', fontSize: '1rem' }}>{credentials?.password}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={Copy}
            onClick={() => navigator.clipboard?.writeText(credentials.password).then(() => toast.success('Password copied'))}
          >
            Copy
          </Button>
        </div>
      </Modal>
    </div>
  );
}
