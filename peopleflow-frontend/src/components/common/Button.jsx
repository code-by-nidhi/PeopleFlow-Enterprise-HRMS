import React from 'react';

const ICON_SIZES = { sm: 14, md: 16, lg: 20 };

export function Button({
  children,
  variant = 'primary', // 'primary' | 'accent' | 'secondary' | 'danger' | 'success' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon: Icon,
  type = 'button',
  loading = false,
  disabled = false,
  block = false,
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size !== 'md' && `btn-${size}`,
    block && 'btn-block',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <span className="spinner" style={{ width: ICON_SIZES[size], height: ICON_SIZES[size] }} /> : Icon && <Icon size={ICON_SIZES[size]} />}
      {children}
    </button>
  );
}
