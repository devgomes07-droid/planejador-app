import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notify: (message: string, kind?: ToastKind) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog precisa estar dentro do DialogProvider');
  }
  return context;
}

const TOAST_ICONS: Record<ToastKind, string> = {
  success: '✓',
  error: '!',
  info: 'i',
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToastId = useRef(1);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setConfirmOptions(options);
    });
  }, []);

  function closeConfirm(result: boolean) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setConfirmOptions(null);
  }

  const notify = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextToastId.current++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // ESC cancela a confirmação
  useEffect(() => {
    if (!confirmOptions) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeConfirm(false);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmOptions]);

  return (
    <DialogContext.Provider value={{ confirm, notify }}>
      {children}

      {confirmOptions && (
        <div className="dialog-overlay" onClick={() => closeConfirm(false)}>
          <div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-message"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`dialog-icon ${confirmOptions.danger ? 'danger' : ''}`}>
              {confirmOptions.danger ? '!' : '?'}
            </div>
            <h3 id="dialog-title" className="dialog-title">
              {confirmOptions.title}
            </h3>
            <p id="dialog-message" className="dialog-message">
              {confirmOptions.message}
            </p>
            <div className="dialog-actions">
              <button onClick={() => closeConfirm(false)}>
                {confirmOptions.cancelLabel ?? 'Voltar'}
              </button>
              <button
                autoFocus
                className={confirmOptions.danger ? 'btn-danger-solid' : 'btn-primary'}
                onClick={() => closeConfirm(true)}
              >
                {confirmOptions.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.kind}`} role="status">
            <span className="toast-icon">{TOAST_ICONS[toast.kind]}</span>
            <span className="toast-text">{toast.message}</span>
            <button
              className="toast-close"
              aria-label="Fechar aviso"
              onClick={() => dismissToast(toast.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
}