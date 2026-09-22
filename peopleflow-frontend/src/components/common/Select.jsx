import React, { useId } from 'react';

/**
 * options: string[] | { value, label }[]
 * The placeholder is a selectable "empty" option unless the field is required,
 * so filter dropdowns can always go back to "All".
 */
export function Select({
  label,
  options = [],
  required = false,
  placeholder = 'Select option...',
  hint,
  error,
  className = '',
  compact = false,
  id,
  ...props
}) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className={`form-group ${compact ? 'compact' : ''} ${className}`}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`form-select ${error ? 'invalid' : ''}`}
        required={required}
        aria-label={label ? undefined : placeholder}
        {...props}
      >
        {placeholder !== null && <option value="" disabled={required}>{placeholder}</option>}
        {options.map((opt) => {
          const value = typeof opt === 'object' ? opt.value : opt;
          const text = typeof opt === 'object' ? opt.label : opt;
          return <option key={value} value={value}>{text}</option>;
        })}
      </select>
      {error ? <span className="form-error">{error}</span> : hint ? <span className="form-hint">{hint}</span> : null}
    </div>
  );
}
