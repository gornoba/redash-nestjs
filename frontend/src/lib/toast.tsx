'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastTone = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  actionLabel?: string;
  message: string;
  onAction?: () => void | Promise<void>;
  tone?: ToastTone;
}

interface ToastItem extends ToastOptions {
  id: number;
  visible: boolean;
}

interface ToastContextValue {
  showError: (message: string, options?: Omit<ToastOptions, 'message' | 'tone'>) => void;
  showInfo: (message: string, options?: Omit<ToastOptions, 'message' | 'tone'>) => void;
  showSuccess: (message: string, options?: Omit<ToastOptions, 'message' | 'tone'>) => void;
  showToast: (options: ToastOptions) => void;
  showWarning: (message: string, options?: Omit<ToastOptions, 'message' | 'tone'>) => void;
}

const TOAST_FADE_DELAY_MS = 3600;
const TOAST_REMOVE_DELAY_MS = 4000;

const toneClassNames: Record<ToastTone, string> = {
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
};

const actionToneClassNames: Record<ToastTone, string> = {
  error: 'text-rose-700 hover:text-rose-800',
  info: 'text-sky-700 hover:text-sky-800',
  success: 'text-emerald-700 hover:text-emerald-800',
  warning: 'text-amber-800 hover:text-amber-900',
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timerIdsRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);

    setToasts((currentToasts) => [
      ...currentToasts,
      {
        ...options,
        id,
        tone: options.tone ?? 'info',
        visible: false,
      },
    ]);

    const showTimer = window.setTimeout(() => {
      setToasts((currentToasts) =>
        currentToasts.map((toast) =>
          toast.id === id ? { ...toast, visible: true } : toast,
        ),
      );
    }, 10);

    const fadeTimer = window.setTimeout(() => {
      setToasts((currentToasts) =>
        currentToasts.map((toast) =>
          toast.id === id ? { ...toast, visible: false } : toast,
        ),
      );
    }, TOAST_FADE_DELAY_MS);

    const removeTimer = window.setTimeout(() => {
      setToasts((currentToasts) =>
        currentToasts.filter((toast) => toast.id !== id),
      );
      timerIdsRef.current = timerIdsRef.current.filter(
        (timerId) => timerId !== showTimer && timerId !== fadeTimer && timerId !== removeTimer,
      );
    }, TOAST_REMOVE_DELAY_MS);

    timerIdsRef.current.push(showTimer, fadeTimer, removeTimer);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showError: (message, options) =>
        showToast({ ...options, message, tone: 'error' }),
      showInfo: (message, options) =>
        showToast({ ...options, message, tone: 'info' }),
      showSuccess: (message, options) =>
        showToast({ ...options, message, tone: 'success' }),
      showToast,
      showWarning: (message, options) =>
        showToast({ ...options, message, tone: 'warning' }),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-0 z-[200] flex items-end justify-end p-4 sm:p-6"
        style={{
          paddingBottom: `calc(var(--toast-bottom-offset, 0px) + 1rem)`,
        }}
      >
        <div className="flex w-full max-w-[360px] flex-col gap-3">
          {toasts.map((toast) => {
            const tone = toast.tone ?? 'info';

            return (
              <div
                key={toast.id}
                className={[
                  'pointer-events-auto rounded border px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.18)] transition-all duration-300',
                  toneClassNames[tone],
                  toast.visible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-2 opacity-0',
                ].join(' ')}
                role="status"
              >
                <div className="text-[13px] leading-6">{toast.message}</div>
                {toast.actionLabel && toast.onAction ? (
                  <button
                    className={[
                      'mt-2 text-[13px] font-semibold underline underline-offset-2 transition',
                      actionToneClassNames[tone],
                    ].join(' ')}
                    onClick={() => {
                      void toast.onAction?.();
                    }}
                    type="button"
                  >
                    {toast.actionLabel}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider.');
  }

  return context;
}

export function useToastMessage(
  message: string | null,
  tone: ToastTone,
  options?: Omit<ToastOptions, 'message' | 'tone'>,
) {
  const { showToast } = useToast();
  const previousMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!message) {
      previousMessageRef.current = null;
      return;
    }

    if (previousMessageRef.current === message) {
      return;
    }

    previousMessageRef.current = message;
    showToast({
      ...options,
      message,
      tone,
    });
  }, [message, options, showToast, tone]);
}
