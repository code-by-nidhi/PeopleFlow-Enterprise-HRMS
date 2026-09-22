import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function Input({
  label,
  type = 'text',
  required = false,
  icon: Icon,
  suffix,
  hint,
  error,
  className = '',
  compact = false,
  id,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const describedBy = error || hint ? `${inputId}-desc` : undefined;

  return (
    <div className={`form-group ${compact ? 'compact' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {Icon && <Icon className="input-icon" size={18} />}
        <input
          id={inputId}
          type={type}
          className={['form-input', Icon && 'has-icon', suffix && 'has-suffix', error && 'invalid'].filter(Boolean).join(' ')}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {suffix}
      </div>
      {error ? (
        <span id={describedBy} className="form-error">{error}</span>
      ) : hint ? (
        <span id={describedBy} className="form-hint">{hint}</span>
      ) : null}
    </div>
  );
}

export function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      suffix={(
        <button
          type="button"
          className="input-suffix"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    />
  );
}

export function Textarea({ label, required = false, hint, error, className = '', id, rows = 4, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <textarea id={inputId} rows={rows} required={required} className={`form-textarea ${error ? 'invalid' : ''}`} {...props} />
      {error ? <span className="form-error">{error}</span> : hint ? <span className="form-hint">{hint}</span> : null}
    </div>
  );
}
