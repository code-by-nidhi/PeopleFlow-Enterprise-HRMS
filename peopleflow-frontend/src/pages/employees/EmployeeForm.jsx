import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, User, Briefcase, Wallet, KeyRound, Upload } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input, PasswordInput, Textarea } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { FileUpload } from '../../components/common/FileUpload';
import { Alert } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { departmentsApi, designationsApi, usersApi } from '../../api/endpoints';
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  GENDER_LABELS,
  PASSWORD_REGEX,
  ROLE_LABELS,
  toOptions,
} from '../../utils/constants';
import { formatCurrency, toInputDate } from '../../utils/format';

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  gender: '',
  dateOfBirth: '',
  address: '',
  department: '',
  designation: '',
  manager: '',
  employmentType: 'full-time',
  status: 'active',
  joiningDate: toInputDate(),
  salary: { basic: '', hra: '', allowances: '', deductions: '' },
  password: '',
  confirmPassword: '',
};

/** Converts an API employee into form state. */
export function employeeToForm(employee) {
  return {
    ...EMPTY,
    firstName: employee.firstName || '',
    lastName: employee.lastName || '',
    email: employee.user?.email || '',
    phone: employee.phone || '',
    gender: employee.gender || '',
    dateOfBirth: employee.dateOfBirth ? toInputDate(employee.dateOfBirth) : '',
    address: employee.address || '',
    department: employee.department?._id || '',
    designation: employee.designation?._id || '',
    manager: employee.manager?._id || '',
    employmentType: employee.employmentType || 'full-time',
    status: employee.status || 'active',
    joiningDate: employee.joiningDate ? toInputDate(employee.joiningDate) : '',
    salary: {
      basic: employee.salary?.basic ?? '',
      hra: employee.salary?.hra ?? '',
      allowances: employee.salary?.allowances ?? '',
      deductions: employee.salary?.deductions ?? '',
    },
  };
}

const validate = (form, isEdit) => {
  const errors = {};
  const name = /^[A-Za-z .'-]{2,50}$/;
  if (!name.test(form.firstName.trim())) errors.firstName = 'Enter a valid first name';
  if (!name.test(form.lastName.trim())) errors.lastName = 'Enter a valid last name';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email';
  if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) errors.phone = 'Enter a valid 10 digit mobile number';
  if (!form.department) errors.department = 'Select a department';
  if (!form.designation) errors.designation = 'Select a designation';
  if (!form.joiningDate) errors.joiningDate = 'Joining date is required';
  if (!(Number(form.salary.basic) > 0)) errors.basic = 'Basic salary must be greater than 0';
  if (!isEdit && form.password) {
    if (!PASSWORD_REGEX.test(form.password)) errors.password = '8-20 chars with upper, lower, number & special character';
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
};

/**
 * Shared create/edit form. `onSubmit(payload, files)` must return a promise;
 * files are only collected in create mode (uploads need the new employee id).
 */
export function EmployeeForm({ initialValues, isEdit = false, onSubmit, submitLabel }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(initialValues || EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState({ avatar: null, resume: null });

  const { data: departments } = useFetch((config) => departmentsApi.list(config), []);
  const { data: designations } = useFetch((config) => designationsApi.list(undefined, config), []);
  const { data: managers } = useFetch((config) => usersApi.options('admin,hr,manager', config), []);

  // Designations of the chosen department plus company-wide ones
  const designationOptions = useMemo(() => (designations || [])
    .filter((d) => !form.department || !d.department || d.department._id === form.department)
    .map((d) => ({ value: d._id, label: d.department ? d.title : `${d.title} (all departments)` })), [designations, form.department]);

  const selectedDesignation = designations?.find((d) => d._id === form.designation);
  const gross = ['basic', 'hra', 'allowances'].reduce((sum, key) => sum + Number(form.salary[key] || 0), 0) - Number(form.salary.deductions || 0);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const bind = (key) => ({ name: key, value: form[key], onChange: (e) => set(key, e.target.value), error: errors[key] });
  const bindSalary = (key) => ({
    type: 'number',
    min: 0,
    inputMode: 'numeric',
    value: form.salary[key],
    error: errors[key],
    onChange: (e) => {
      setForm((prev) => ({ ...prev, salary: { ...prev.salary, [key]: e.target.value } }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form, isEdit);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setServerError('Please fix the highlighted fields.');
      return;
    }

    const { confirmPassword: _confirmPassword, password, salary, ...rest } = form;
    const payload = {
      ...rest,
      firstName: rest.firstName.trim(),
      lastName: rest.lastName.trim(),
      email: rest.email.trim(),
      salary: Object.fromEntries(Object.entries(salary).map(([k, v]) => [k, Number(v || 0)])),
      ...(!isEdit && password ? { password } : {}),
    };

    setSubmitting(true);
    setServerError('');
    try {
      await onSubmit(payload, files);
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Alert type="error">{serverError}</Alert>

      <section className="form-section">
        <div className="form-section-head">
          <User size={20} />
          <h3 className="form-section-title">Personal Information</h3>
        </div>
        <p className="form-section-desc">Basic details and contact information</p>
        <div className="form-grid">
          <Input label="First Name" placeholder="e.g. Rahul" required autoComplete="given-name" {...bind('firstName')} />
          <Input label="Last Name" placeholder="e.g. Sharma" required autoComplete="family-name" {...bind('lastName')} />
          <Input label="Email Address" type="email" placeholder="rahul.sharma@company.com" required autoComplete="off" {...bind('email')} />
          <Input label="Phone Number" type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" {...bind('phone')} />
          <Input label="Date of Birth" type="date" max={toInputDate()} {...bind('dateOfBirth')} />
          <Select label="Gender" placeholder="Select gender" options={toOptions(GENDER_LABELS)} {...bind('gender')} />
        </div>
        <Textarea label="Address" rows={2} placeholder="Residential address" {...bind('address')} />
      </section>

      <section className="form-section">
        <div className="form-section-head">
          <Briefcase size={20} />
          <h3 className="form-section-title">Employment Information</h3>
        </div>
        <p className="form-section-desc">Department, role, reporting line and joining details</p>
        <div className="form-grid">
          <Select
            label="Department"
            placeholder="Select department"
            required
            options={(departments || []).map((d) => ({ value: d._id, label: d.name }))}
            hint={departments && !departments.length ? 'Create a department first' : undefined}
            {...bind('department')}
            onChange={(e) => {
              set('department', e.target.value);
              const current = designations?.find((d) => d._id === form.designation);
              if (current?.department && current.department._id !== e.target.value) set('designation', '');
            }}
          />
          <Select label="Designation" placeholder="Select designation" required options={designationOptions} {...bind('designation')} />
          <Select
            label="Reporting Manager"
            placeholder="No manager"
            options={(managers || []).map((m) => ({ value: m._id, label: `${m.name} (${ROLE_LABELS[m.role]})` }))}
            {...bind('manager')}
          />
          <Input label="Joining Date" type="date" required {...bind('joiningDate')} />
          <Select label="Employment Type" placeholder={null} options={toOptions(EMPLOYMENT_TYPE_LABELS)} {...bind('employmentType')} />
          <Select label="Status" placeholder={null} options={toOptions(EMPLOYEE_STATUS_LABELS)} {...bind('status')} />
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-head">
          <Wallet size={20} />
          <h3 className="form-section-title">Salary Structure</h3>
        </div>
        <p className="form-section-desc">
          Monthly components in INR
          {selectedDesignation?.salaryRange?.max ? ` · Band for ${selectedDesignation.title}: ${formatCurrency(selectedDesignation.salaryRange.min)} – ${formatCurrency(selectedDesignation.salaryRange.max)}` : ''}
        </p>
        <div className="form-grid">
          <Input label="Basic" required placeholder="40000" {...bindSalary('basic')} />
          <Input label="House Rent Allowance" placeholder="8000" {...bindSalary('hra')} />
          <Input label="Other Allowances" placeholder="2000" {...bindSalary('allowances')} />
          <Input label="Deductions" placeholder="1500" {...bindSalary('deductions')} />
        </div>
        <div className="row-between text-sm" style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <span className="text-muted">Net monthly pay</span>
          <strong>{formatCurrency(gross)}</strong>
        </div>
      </section>

      {!isEdit && (
        <>
          <section className="form-section">
            <div className="form-section-head">
              <KeyRound size={20} />
              <h3 className="form-section-title">Login Credentials</h3>
            </div>
            <p className="form-section-desc">
              Leave blank to generate a secure temporary password that is emailed to the employee. They must change it at first login.
            </p>
            <div className="form-grid">
              <PasswordInput label="Initial Password" autoComplete="new-password" placeholder="Optional" {...bind('password')} />
              <PasswordInput label="Confirm Password" autoComplete="new-password" placeholder="Optional" {...bind('confirmPassword')} />
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <Upload size={20} />
              <h3 className="form-section-title">Profile &amp; Documents</h3>
            </div>
            <p className="form-section-desc">Optional — uploaded right after the employee is created</p>
            <div className="form-grid">
              <FileUpload
                label="Profile Photo"
                hint="PNG, JPG or WEBP (max. 5MB)"
                accept="image/png,image/jpeg,image/webp"
                maxSizeMb={5}
                selectedName={files.avatar?.name}
                onSelect={(file) => setFiles((f) => ({ ...f, avatar: file }))}
                onError={(msg) => toast.error('Invalid file', msg)}
              />
              <FileUpload
                label="Resume"
                hint="PDF, DOC or DOCX (max. 10MB)"
                accept=".pdf,.doc,.docx"
                selectedName={files.resume?.name}
                onSelect={(file) => setFiles((f) => ({ ...f, resume: file }))}
                onError={(msg) => toast.error('Invalid file', msg)}
              />
            </div>
          </section>
        </>
      )}

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
