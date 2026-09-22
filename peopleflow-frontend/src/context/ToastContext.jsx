import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const DURATION = 4500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, title, message) => {
    if (!title) return;
    const id = ++counter.current;
    // Keep at most 4 toasts on screen
    setToasts((current) => [...current.slice(-3), { id, type, title, message }]);
    setTimeout(() => dismiss(id), DURATION);
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (title, message) => push('success', title, message),
    error: (title, message) => push('error', title, message),
    info: (title, message) => push('info', title, message),
  }), [push]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map(({ id, type, title, message }) => {
          const Icon = ICONS[type];
          return (
            <div key={id} className={`toast ${type}`}>
              <Icon size={18} />
              <div className="toast-body">
                <div className="toast-title">{title}</div>
                {message && <div className="toast-message">{message}</div>}
              </div>
              <button type="button" className="btn-ghost" onClick={() => dismiss(id)} aria-label="Dismiss notification">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
