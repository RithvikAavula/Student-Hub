/**
 * Animated Toast Notifications
 * 
 * Features:
 * - Slide-in + bounce entrance animation
 * - Animated icons
 * - Progress bar for auto-dismiss
 * - Stacked toasts with smooth reordering
 * - Multiple variants (success, error, warning, info)
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { spring, duration } from '@/lib/motion';
import { Check, X, AlertTriangle, Info, Loader2 } from 'lucide-react';

// ============================================
// TYPES
// ============================================

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, toast: Partial<Toast>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  loading: (title: string, description?: string) => string;
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => Promise<T>;
}

// ============================================
// CONTEXT
// ============================================

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToastNotification = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastNotification must be used within AnimatedToastProvider');
  }
  return context;
};

// ============================================
// PROVIDER
// ============================================

interface AnimatedToastProviderProps {
  children: ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export const AnimatedToastProvider: React.FC<AnimatedToastProviderProps> = ({
  children,
  position = 'bottom-right',
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => {
      const newToasts = [{ ...toast, id }, ...prev];
      return newToasts.slice(0, maxToasts);
    });
    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, toast: Partial<Toast>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...toast } : t))
    );
  }, []);

  const success = useCallback((title: string, description?: string) => {
    addToast({ type: 'success', title, description, duration: 4000 });
  }, [addToast]);

  const error = useCallback((title: string, description?: string) => {
    addToast({ type: 'error', title, description, duration: 5000 });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string) => {
    addToast({ type: 'warning', title, description, duration: 4500 });
  }, [addToast]);

  const info = useCallback((title: string, description?: string) => {
    addToast({ type: 'info', title, description, duration: 4000 });
  }, [addToast]);

  const loading = useCallback((title: string, description?: string): string => {
    return addToast({ type: 'loading', title, description });
  }, [addToast]);

  const promise = useCallback<ToastContextType['promise']>(
    async (promise, options) => {
      const id = loading(options.loading);
      try {
        const data = await promise;
        updateToast(id, {
          type: 'success',
          title: typeof options.success === 'function' ? options.success(data) : options.success,
          duration: 4000,
        });
        return data;
      } catch (err) {
        updateToast(id, {
          type: 'error',
          title: typeof options.error === 'function' ? options.error(err) : options.error,
          duration: 5000,
        });
        throw err;
      }
    },
    [loading, updateToast]
  );

  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        updateToast,
        success,
        error,
        warning,
        info,
        loading,
        promise,
      }}
    >
      {children}
      
      {/* Toast Container */}
      <div
        className={cn(
          'fixed z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none',
          positionStyles[position]
        )}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast, index) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              index={index}
              onRemove={() => removeToast(toast.id)}
              position={position}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// ============================================
// TOAST ITEM
// ============================================

interface ToastItemProps {
  toast: Toast;
  index: number;
  onRemove: () => void;
  position: AnimatedToastProviderProps['position'];
}

const ToastItem: React.FC<ToastItemProps> = ({
  toast,
  index,
  onRemove,
  position,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(100);

  // Auto-dismiss with progress
  useEffect(() => {
    if (toast.type === 'loading' || !toast.duration) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration!) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onRemove();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.duration, toast.type, onRemove]);

  const isLeft = position?.includes('left');
  const isBottom = position?.includes('bottom');

  const slideDirection = {
    x: isLeft ? -100 : 100,
    y: isBottom ? 50 : -50,
  };

  const typeStyles = {
    success: {
      bg: 'bg-success/10 border-success/30',
      icon: <Check className="w-5 h-5 text-success" />,
      iconBg: 'bg-success/20',
    },
    error: {
      bg: 'bg-destructive/10 border-destructive/30',
      icon: <X className="w-5 h-5 text-destructive" />,
      iconBg: 'bg-destructive/20',
    },
    warning: {
      bg: 'bg-warning/10 border-warning/30',
      icon: <AlertTriangle className="w-5 h-5 text-warning" />,
      iconBg: 'bg-warning/20',
    },
    info: {
      bg: 'bg-info/10 border-info/30',
      icon: <Info className="w-5 h-5 text-info" />,
      iconBg: 'bg-info/20',
    },
    loading: {
      bg: 'bg-primary/10 border-primary/30',
      icon: <Loader2 className="w-5 h-5 text-primary animate-spin" />,
      iconBg: 'bg-primary/20',
    },
  };

  const styles = typeStyles[toast.type];

  return (
    <motion.div
      layout
      initial={shouldReduceMotion ? {} : { 
        opacity: 0, 
        x: slideDirection.x,
        scale: 0.9,
      }}
      animate={shouldReduceMotion ? {} : { 
        opacity: 1, 
        x: 0, 
        scale: 1,
      }}
      exit={shouldReduceMotion ? {} : { 
        opacity: 0, 
        x: slideDirection.x,
        scale: 0.9,
      }}
      transition={spring.bouncy}
      className={cn(
        'relative pointer-events-auto w-full rounded-xl border shadow-lg overflow-hidden',
        'bg-card backdrop-blur-xl',
        styles.bg
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <motion.div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            styles.iconBg
          )}
          initial={shouldReduceMotion ? {} : { scale: 0, rotate: -180 }}
          animate={shouldReduceMotion ? {} : { scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, ...spring.bouncy }}
        >
          {styles.icon}
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <motion.p
            className="font-medium text-foreground"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 5 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {toast.title}
          </motion.p>
          {toast.description && (
            <motion.p
              className="mt-1 text-sm text-muted-foreground"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 5 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {toast.description}
            </motion.p>
          )}
          {toast.action && (
            <motion.button
              className="mt-2 text-sm font-medium text-primary hover:underline"
              onClick={toast.action.onClick}
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={shouldReduceMotion ? {} : { opacity: 1 }}
              transition={{ delay: 0.25 }}
              whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            >
              {toast.action.label}
            </motion.button>
          )}
        </div>

        {/* Close button */}
        {toast.type !== 'loading' && (
          <motion.button
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            onClick={onRemove}
            whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Progress bar */}
      {toast.type !== 'loading' && toast.duration && (
        <motion.div
          className={cn(
            'absolute bottom-0 left-0 h-1',
            toast.type === 'success' && 'bg-success',
            toast.type === 'error' && 'bg-destructive',
            toast.type === 'warning' && 'bg-warning',
            toast.type === 'info' && 'bg-info'
          )}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05 }}
        />
      )}
    </motion.div>
  );
};

// ============================================
// SIMPLE TOAST FUNCTION (Standalone)
// ============================================

let toastCounter = 0;
const toastListeners: Set<(toast: Toast) => void> = new Set();
const toasts: Toast[] = [];

export const toast = {
  success: (title: string, description?: string) => {
    const toast: Toast = {
      id: `toast-${++toastCounter}`,
      type: 'success',
      title,
      description,
      duration: 4000,
    };
    toastListeners.forEach((listener) => listener(toast));
  },
  error: (title: string, description?: string) => {
    const toast: Toast = {
      id: `toast-${++toastCounter}`,
      type: 'error',
      title,
      description,
      duration: 5000,
    };
    toastListeners.forEach((listener) => listener(toast));
  },
  warning: (title: string, description?: string) => {
    const toast: Toast = {
      id: `toast-${++toastCounter}`,
      type: 'warning',
      title,
      description,
      duration: 4500,
    };
    toastListeners.forEach((listener) => listener(toast));
  },
  info: (title: string, description?: string) => {
    const toast: Toast = {
      id: `toast-${++toastCounter}`,
      type: 'info',
      title,
      description,
      duration: 4000,
    };
    toastListeners.forEach((listener) => listener(toast));
  },
};

export default AnimatedToastProvider;
