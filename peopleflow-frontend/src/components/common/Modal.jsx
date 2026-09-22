import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmLoading = false,
  confirmDisabled = false,
  variant = 'primary',
  footer,
  maxWidth,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !confirmLoading) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [isOpen, onClose, confirmLoading]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={() => !confirmLoading && onClose()}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="icon-btn plain" onClick={onClose} aria-label="Close dialog" disabled={confirmLoading}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer !== null && (
          <div className="modal-footer">
            {footer || (
              <>
                <Button variant="secondary" onClick={onClose} disabled={confirmLoading}>
                  {cancelLabel}
                </Button>
                {onConfirm && (
                  <Button variant={variant} onClick={onConfirm} loading={confirmLoading} disabled={confirmDisabled}>
                    {confirmLabel}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
