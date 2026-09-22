import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, UserCog } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Alert } from '../../components/common/Feedback';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, ROLES } from '../../utils/constants';
import { isAdmin } from '../../utils/auth';

const NAME_REGEX = /^[A-Za-z .'-]{2,50}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const roleOption = (role) => ({ value: role, label: ROLE_LABELS[role] });

const validate = (form) => {
  const errors = {};
  if (!NAME_REGEX.test(form.name.trim())) errors.name = 'Enter a valid name (letters, spaces, . \' -)';
  if (!EMAIL_REGEX.test(form.email.trim())) errors.email = 'Enter a valid email';
  if (!form.role) errors.role = 'Select a role';
  return errors;
};

/**
 * Shared create/edit form for login accounts. Edit mode when `account` (API user)
 * is passed; `hasEmployeeProfile` unlocks the Employee role.
 * `onSubmit(payload)` must return a promise and throw an Error with a readable message on failure.
 */
export function UserForm({ account, hasEmployeeProfile = false, onSubmit, submitLabel }) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const isEdit = Boolean(account);
  const isSelf = isEdit && account._id === authUser?._id;

  // HR may only create manager accounts; employee accounts come from the Employees module
  const roles = !isEdit
    ? (isAdmin(authUser) ? [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] : [ROLES.MANAGER])
    : [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ...(hasEmployeeProfile || account.role === ROLES.EMPLOYEE ? [ROLES.EMPLOYEE] : [])];

  const [form, setForm] = useState(() => ({
    name: account?.name || '',
    email: account?.email || '',
    role: account?.role || (roles.length === 1 ? roles[0] : ''),
  }));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const bind = (key) => ({ name: key, value: form[key], onChange: (e) => set(key, e.target.value), error: errors[key] });

  const roleChanged = isEdit && form.role !== account.role;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setServerError('Please fix the highlighted fields.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      // The API rejects role changes on your own account
      ...(isSelf ? {} : { role: form.role }),
    };

    setSubmitting(true);
    setServerError('');
    try {
      await onSubmit(payload);
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };

  let roleHint = 'Controls what this person can see and do';
  if (isSelf) roleHint = 'You cannot change your own role';
  else if (roleChanged) roleHint = 'The user will be signed out so the new role takes effect';
  else if (!isEdit && roles.length === 1) roleHint = 'HR can create manager accounts only';

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-md">
      <Alert type="error">{serverError}</Alert>

      {!isEdit && (
        <Alert type="info">
          This creates a login account for administrators, HR or managers. To add staff, use the Employees module,
          which creates the employee profile and its login together.
        </Alert>
      )}

      <section className="form-section">
        <div className="form-section-head">
          <UserCog size={20} />
          <h3 className="form-section-title">Account Details</h3>
        </div>
        <p className="form-section-desc">
          {isEdit
            ? 'Name, sign-in email and access role'
            : 'A temporary password is generated and emailed to the user. They must change it at first login.'}
        </p>

        <div className="form-grid">
          <Input label="Full Name" placeholder="e.g. Priya Nair" required maxLength={50} autoComplete="off" {...bind('name')} />
          <Input label="Email Address" type="email" placeholder="priya.nair@company.com" required autoComplete="off" {...bind('email')} />
          <Select
            label="Role"
            placeholder={roles.length === 1 ? null : 'Select role'}
            required
            options={roles.map(roleOption)}
            disabled={isSelf}
            hint={roleHint}
            {...bind('role')}
          />
        </div>
      </section>

      <div className="form-actions">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" icon={Save} loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
