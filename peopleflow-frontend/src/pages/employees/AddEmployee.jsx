import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { EmployeeForm } from './EmployeeForm';
import { employeesApi, uploadApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export function AddEmployee() {
  const navigate = useNavigate();
  const toast = useToast();
  const [credentials, setCredentials] = useState(null);

  const handleSubmit = async (payload, files) => {
    let result;
    try {
      const res = await employeesApi.create(payload);
      result = res.data.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }

    const { employee, temporaryPassword } = result;
    const uploads = [];
    if (files.avatar) uploads.push(uploadApi.profile(files.avatar, employee.user._id));
    if (files.resume) uploads.push(uploadApi.resume(files.resume, employee._id));
    const failed = (await Promise.allSettled(uploads)).filter((r) => r.status === 'rejected');
    if (failed.length) toast.error('Some files failed to upload', 'You can upload them again from the employee profile.');

    toast.success('Employee created', `${employee.firstName} ${employee.lastName} (${employee.employeeId})`);

    if (temporaryPassword) {
      // Email is not configured on the server, so HR must share the password manually
      setCredentials({ email: employee.user.email, password: temporaryPassword, id: employee._id });
    } else {
      navigate(`/employees/${employee._id}`, { replace: true });
    }
  };

  return (
    <div>
      <PageHeader title="Add New Employee" subtitle="Create the employee profile and their portal login in one step">
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/employees')}>
          Back to Directory
        </Button>
      </PageHeader>

      <EmployeeForm onSubmit={handleSubmit} submitLabel="Create Employee" />

      <Modal
        isOpen={Boolean(credentials)}
        onClose={() => navigate(`/employees/${credentials.id}`, { replace: true })}
        title="Share login credentials"
        footer={(
          <Button onClick={() => navigate(`/employees/${credentials.id}`, { replace: true })}>View Employee</Button>
        )}
      >
        <p style={{ marginBottom: '1rem' }}>
          Email delivery is not configured, so share this temporary password with the employee securely.
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
