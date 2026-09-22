import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Check, X, LogOut } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '../../components/common/Button';
import { PasswordInput } from '../../components/common/Input';
import { Alert } from '../../components/common/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';
import { PASSWORD_RULES, PASSWORD_REGEX } from '../../utils/constants';

const HIGHLIGHTS = [
  { title: 'Encrypted Storage', text: 'Passwords are hashed with bcrypt' },
  { title: 'Session Safety', text: 'Keep your credentials confidential' },
];

export function ChangePassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, updateUser, logout } = useAuth();
  const forced = Boolean(user?.mustChangePassword);

  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { currentPassword, newPassword, confirmPassword } = formData;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: undefined });
    setServerError('');
  };

  const validate = () => {
    const next = {};
    if (!currentPassword) next.currentPassword = 'Current password is required';
    if (!PASSWORD_REGEX.test(newPassword)) next.newPassword = 'Password does not meet all requirements';
    else if (newPassword === currentPassword) next.newPassword = 'New password must be different from the current one';
    if (newPassword !== confirmPassword) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await authApi.changePassword(formData);
      updateUser({ mustChangePassword: false });
      toast.success(res.data.message || 'Password changed successfully');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, 'Unable to change password.'));
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AuthLayout
      heroTitle="Secure your account access"
      heroText="Set a strong, unique password to protect employee records, attendance data and your enterprise workspace."
      highlights={HIGHLIGHTS}
    >
      <div className="auth-card">
        <div className="auth-card-head">
          <h2>{forced ? 'Set a new password' : 'Change your password'}</h2>
          <p>
            {forced
              ? 'For security, replace the temporary password you received before continuing.'
              : 'Enter your current password and choose a new one.'}
          </p>
        </div>

        <Alert type="error">{serverError}</Alert>

        <form onSubmit={handleSubmit}>
          <PasswordInput
            label={forced ? 'Temporary Password' : 'Current Password'}
            name="currentPassword"
            autoComplete="current-password"
            value={currentPassword}
            onChange={handleChange}
            icon={Lock}
            error={errors.currentPassword}
            required
          />
          <PasswordInput
            label="New Password"
            name="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={handleChange}
            icon={Lock}
            error={errors.newPassword}
            required
          />
          <PasswordInput
            label="Confirm New Password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={handleChange}
            icon={Lock}
            error={errors.confirmPassword}
            required
          />

          <div className="password-rules" aria-live="polite">
            <span className="text-xs text-bold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Password requirements
            </span>
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(newPassword);
              return (
                <div key={rule.key} className={`password-rule ${met ? 'met' : ''}`}>
                  {met ? <Check size={15} /> : <X size={15} />}
                  {rule.label}
                </div>
              );
            })}
          </div>

          <Button type="submit" size="lg" icon={ArrowRight} loading={submitting} block>
            {submitting ? 'Updating password…' : 'Update Password'}
          </Button>
        </form>

        <div className="auth-card-foot">
          {forced ? (
            <button type="button" className="link" onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LogOut size={14} /> Sign out instead
            </button>
          ) : (
            <button type="button" className="link" onClick={() => navigate(-1)}>Go back</button>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
