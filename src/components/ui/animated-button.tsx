/**
 * Animated Button Component
 * 
 * Features:
 * - Gradient shift animation on hover
 * - Ripple/wave click effect
 * - Soft glow ring on focus
 * - Micro scale down and bounce back on press
 * - Loading spinner support
 */

import React, { useState, useRef, ReactNode, MouseEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion';
import { Loader2 } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface RippleItem {
  id: number;
  x: number;
  y: number;
}

// Omit drag-related properties that conflict with Framer Motion
type SafeButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'
>;

interface AnimatedButtonProps extends SafeButtonProps {
  children: ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'gradient';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  ripple?: boolean;
  glow?: boolean;
}

// ============================================
// ANIMATED BUTTON
// ============================================

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  className,
  variant = 'default',
  size = 'default',
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  ripple = true,
  glow = false,
  disabled,
  onClick,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleIdRef = useRef(0);

  // Variant styles
  const variantStyles = {
    default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
    gradient: 'bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] text-primary-foreground shadow-md',
  };

  // Size styles
  const sizeStyles = {
    default: 'h-10 px-4 py-2 text-sm',
    sm: 'h-9 px-3 text-xs',
    lg: 'h-12 px-8 text-base',
    icon: 'h-10 w-10',
  };

  // Handle ripple effect
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (ripple && !shouldReduceMotion && !disabled && !loading && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newRipple: RippleItem = {
        id: rippleIdRef.current++,
        x,
        y,
      };
      
      setRipples((prev) => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);
    }
    
    onClick?.(e);
  };

  return (
    <motion.button
      ref={buttonRef}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium',
        'ring-offset-background transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'overflow-hidden',
        variantStyles[variant],
        sizeStyles[size],
        glow && 'shadow-lg shadow-primary/25',
        className
      )}
      whileHover={shouldReduceMotion || disabled || loading ? {} : { 
        scale: 1.02,
        backgroundPosition: variant === 'gradient' ? '100% 0' : undefined,
      }}
      whileTap={shouldReduceMotion || disabled || loading ? {} : { scale: 0.95 }}
      transition={spring.snappy}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {/* Glow effect */}
      {glow && !shouldReduceMotion && (
        <motion.div
          className="absolute inset-0 -z-10 rounded-lg bg-primary/30 blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 pointer-events-none"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 20,
              height: 20,
              marginLeft: -10,
              marginTop: -10,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Loading spinner */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText && <span>{loadingText}</span>}
          </motion.span>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            {leftIcon && (
              <motion.span
                whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                transition={spring.snappy}
              >
                {leftIcon}
              </motion.span>
            )}
            {children}
            {rightIcon && (
              <motion.span
                whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                transition={spring.snappy}
              >
                {rightIcon}
              </motion.span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// ============================================
// ICON BUTTON
// ============================================

interface AnimatedIconButtonProps extends SafeButtonProps {
  icon: ReactNode;
  tooltip?: string;
  variant?: 'default' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'default' | 'lg';
}

export const AnimatedIconButton: React.FC<AnimatedIconButtonProps> = ({
  icon,
  tooltip,
  className,
  variant = 'ghost',
  size = 'default',
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();

  const variantStyles = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    outline: 'border border-input bg-background hover:bg-accent',
  };

  const sizeStyles = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <motion.button
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      whileHover={shouldReduceMotion ? {} : { scale: 1.1, rotate: 5 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
      transition={spring.snappy}
      title={tooltip}
      {...props}
    >
      {icon}
    </motion.button>
  );
};

// ============================================
// BUTTON GROUP
// ============================================

interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className }) => {
  return (
    <div className={cn('inline-flex rounded-lg overflow-hidden', className)}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            className: cn(
              child.props.className,
              'rounded-none',
              index === 0 && 'rounded-l-lg',
              index === React.Children.count(children) - 1 && 'rounded-r-lg',
              index !== 0 && 'border-l-0'
            ),
          });
        }
        return child;
      })}
    </div>
  );
};

export default AnimatedButton;
