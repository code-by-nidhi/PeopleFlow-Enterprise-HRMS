import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '../../components/common/Button';
import { Input, PasswordInput } from '../../components/common/Input';
import { Alert } from '../../components/common/Feedback';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';

const HIGHLIGHTS = [
  { title: 'Secure & Scalable', text: 'JWT sessions with role-based access' },
  { title: 'Real-time Insights', text: 'Live dashboards and notifications' },
];

export function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await login({ email: formData.email.trim(), password: formData.password });
      if (result.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        navigate(location.state?.from || '/dashboard', { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in. Please try again.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      heroTitle="Human Resource Management Platform"
      heroText="Streamline employee management, attendance tracking, leave requests, tasks and enterprise operations in one unified workspace."
      highlights={HIGHLIGHTS}
    >
      <div className="auth-card">
        <div className="auth-card-head">
          <h2>Sign in to your account</h2>
          <p>Enter your work credentials to access the portal</p>
        </div>

        <Alert type="error">{error}</Alert>

        <form onSubmit={handleSubmit} noValidate={false}>
          <Input
            label="Work Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={formData.email}
            onChange={handleChange}
            icon={Mail}
            required
            autoFocus
          />

          <PasswordInput
            label="Password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={formData.password}
            onChange={handleChange}
            icon={Lock}
            required
          />

          <Button type="submit" size="lg" icon={ArrowRight} loading={submitting} block style={{ marginTop: '0.5rem' }}>
            {submitting ? 'Signing in…' : 'Login to Dashboard'}
          </Button>
        </form>

        <div className="auth-card-foot">
          Forgot your password or need an account?{' '}
          <span className="text-bold" style={{ color: 'var(--text-primary)' }}>Contact your HR or system administrator.</span>
        </div>
      </div>
    </AuthLayout>
  );
}
