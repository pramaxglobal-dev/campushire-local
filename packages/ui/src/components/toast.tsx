import * as React from "react";
import { cn } from "./lib";

type ToastVariant = "default" | "success" | "warning" | "danger" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastContextValue {
  toast: (message: Omit<ToastMessage, "id">) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const variantClasses: Record<ToastVariant, string> = {
  default: "border-slate-200 bg-white text-slate-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-sky-200 bg-sky-50 text-sky-900"
};

export interface ToastProps extends Omit<ToastMessage, "id"> {
  onClose?: () => void;
}

export const Toast = ({ title, description, variant = "default", onClose }: ToastProps) => {
  return (
    <div className={cn("w-full rounded-md border p-4 shadow-sm", variantClasses[variant])}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          {description ? <p className="text-sm opacity-90">{description}</p> : null}
        </div>
        {onClose ? (
          <button
            type="button"
            className="text-xs font-medium opacity-80 hover:opacity-100"
            onClick={onClose}
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
};

export interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toastItem) => toastItem.id !== id));
  }, []);

  const clear = React.useCallback(() => {
    setToasts([]);
  }, []);

  const toast = React.useCallback((message: Omit<ToastMessage, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { ...message, id }]);
    return id;
  }, []);

  React.useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toastItem) => {
      const duration = toastItem.durationMs ?? 4000;
      return window.setTimeout(() => dismiss(toastItem.id), duration);
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, dismiss]);

  const contextValue = React.useMemo(
    () => ({
      toast,
      dismiss,
      clear
    }),
    [toast, dismiss, clear]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toastItem) => (
          <div key={toastItem.id} className="pointer-events-auto">
            <Toast
              title={toastItem.title}
              description={toastItem.description}
              variant={toastItem.variant}
              onClose={() => dismiss(toastItem.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider.");
  }
  return context;
};
