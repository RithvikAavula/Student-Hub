/**
 * Animated Form Elements
 * 
 * Features:
 * - Floating labels with animated transitions
 * - Animated underline for inputs
 * - Validation states with animated icons and colors
 * - Animated dropdowns for selects
 * - Focus ring animations
 */

import React, { useState, useRef, ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { spring, duration } from '@/lib/motion';
import { Check, X, AlertCircle, ChevronDown, Eye, EyeOff, Search } from 'lucide-react';

// ============================================
// ANIMATED INPUT
// ============================================

interface AnimatedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: 'default' | 'filled' | 'underline';
  inputSize?: 'sm' | 'default' | 'lg';
}

export const AnimatedInput: React.FC<AnimatedInputProps> = ({
  label,
  error,
  success,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'default',
  inputSize = 'default',
  className,
  type,
  value,
  onFocus,
  onBlur,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = value !== undefined && value !== '';
  const isFloating = isFocused || hasValue;
  const isPassword = type === 'password';
  const actualType = isPassword && showPassword ? 'text' : type;

  const sizeStyles = {
    sm: 'h-9 text-sm px-3',
    default: 'h-11 text-base px-4',
    lg: 'h-14 text-lg px-5',
  };

  const variantStyles = {
    default: cn(
      'border rounded-lg bg-background',
      error ? 'border-destructive' : success ? 'border-success' : 'border-input',
      isFocused && !error && !success && 'border-primary ring-2 ring-primary/20'
    ),
    filled: cn(
      'border-0 rounded-lg bg-muted/50',
      isFocused && 'bg-muted ring-2 ring-primary/20'
    ),
    underline: cn(
      'border-0 border-b-2 rounded-none bg-transparent',
      error ? 'border-destructive' : success ? 'border-success' : 'border-input',
      isFocused && !error && !success && 'border-primary'
    ),
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Input container */}
      <motion.div
        className={cn(
          'relative flex items-center transition-all duration-200',
          variantStyles[variant],
          sizeStyles[inputSize]
        )}
        animate={shouldReduceMotion ? {} : {
          scale: isFocused ? 1.01 : 1,
        }}
        transition={spring.snappy}
      >
        {/* Left icon */}
        {leftIcon && (
          <motion.span
            className="mr-2 text-muted-foreground"
            animate={shouldReduceMotion ? {} : {
              color: isFocused ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              scale: isFocused ? 1.1 : 1,
            }}
            transition={spring.snappy}
          >
            {leftIcon}
          </motion.span>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type={actualType}
          value={value}
          className={cn(
            'flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50',
            label && 'pt-4'
          )}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {/* Floating label */}
        {label && (
          <motion.label
            className={cn(
              'absolute left-4 pointer-events-none origin-left',
              leftIcon && 'left-10',
              error ? 'text-destructive' : success ? 'text-success' : 
                isFocused ? 'text-primary' : 'text-muted-foreground'
            )}
            initial={false}
            animate={shouldReduceMotion ? {} : {
              y: isFloating ? -12 : 0,
              scale: isFloating ? 0.75 : 1,
              x: isFloating ? -4 : 0,
            }}
            transition={spring.snappy}
          >
            {label}
          </motion.label>
        )}

        {/* Password toggle */}
        {isPassword && (
          <motion.button
            type="button"
            className="ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
            whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </motion.button>
        )}

        {/* Right icon / Status icon */}
        {(rightIcon || error || success) && (
          <motion.span
            className="ml-2"
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
            transition={spring.bouncy}
          >
            {error ? (
              <X className="w-4 h-4 text-destructive" />
            ) : success ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              rightIcon
            )}
          </motion.span>
        )}

        {/* Underline animation (for underline variant) */}
        {variant === 'underline' && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            initial={{ scaleX: 0 }}
            animate={shouldReduceMotion ? {} : { scaleX: isFocused ? 1 : 0 }}
            transition={spring.snappy}
            style={{ originX: 0 }}
          />
        )}
      </motion.div>

      {/* Helper text / Error message */}
      <AnimatePresence mode="wait">
        {(error || helperText) && (
          <motion.p
            initial={shouldReduceMotion ? {} : { opacity: 0, y: -5, height: 0 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0, height: 'auto' }}
            exit={shouldReduceMotion ? {} : { opacity: 0, y: -5, height: 0 }}
            className={cn(
              'mt-1.5 text-sm flex items-center gap-1',
              error ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {error && <AlertCircle className="w-3 h-3" />}
            {error || helperText}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// ANIMATED SELECT
// ============================================

interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface AnimatedSelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const AnimatedSelect: React.FC<AnimatedSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  error,
  disabled,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: SelectOption) => {
    if (!option.disabled) {
      onChange?.(option.value);
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Label */}
      {label && (
        <motion.label
          className={cn(
            'block mb-1.5 text-sm font-medium',
            error ? 'text-destructive' : 'text-foreground'
          )}
          animate={shouldReduceMotion ? {} : {
            color: isFocused ? 'hsl(var(--primary))' : undefined,
          }}
        >
          {label}
        </motion.label>
      )}

      {/* Trigger */}
      <motion.button
        type="button"
        className={cn(
          'w-full h-11 px-4 flex items-center justify-between rounded-lg border bg-background',
          'transition-all duration-200',
          error ? 'border-destructive' : 'border-input',
          isFocused && !error && 'border-primary ring-2 ring-primary/20',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        whileTap={shouldReduceMotion || disabled ? {} : { scale: 0.99 }}
        disabled={disabled}
      >
        <span className={cn(
          'flex items-center gap-2 truncate',
          !selectedOption && 'text-muted-foreground'
        )}>
          {selectedOption?.icon}
          {selectedOption?.label || placeholder}
        </span>
        <motion.span
          animate={shouldReduceMotion ? {} : { rotate: isOpen ? 180 : 0 }}
          transition={spring.snappy}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.span>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: -10, scale: 0.95 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: duration.fast }}
            className={cn(
              'absolute z-50 w-full mt-1 py-1 rounded-lg border border-border',
              'bg-popover shadow-lg overflow-hidden'
            )}
          >
            {options.map((option, index) => (
              <motion.button
                key={option.value}
                type="button"
                initial={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'w-full px-4 py-2 flex items-center gap-2 text-left',
                  'transition-colors hover:bg-muted',
                  option.disabled && 'opacity-50 cursor-not-allowed',
                  option.value === value && 'bg-primary/10 text-primary'
                )}
                onClick={() => handleSelect(option)}
                disabled={option.disabled}
              >
                {option.icon}
                <span className="flex-1">{option.label}</span>
                {option.value === value && (
                  <motion.span
                    initial={shouldReduceMotion ? {} : { scale: 0 }}
                    animate={shouldReduceMotion ? {} : { scale: 1 }}
                    transition={spring.bouncy}
                  >
                    <Check className="w-4 h-4" />
                  </motion.span>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={shouldReduceMotion ? {} : { opacity: 0, y: -5 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, y: -5 }}
            className="mt-1.5 text-sm text-destructive flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// ANIMATED SEARCH INPUT
// ============================================

interface AnimatedSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: (value: string) => void;
  loading?: boolean;
  className?: string;
}

export const AnimatedSearch: React.FC<AnimatedSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  onSearch,
  loading = false,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch?.(value);
    }
  };

  return (
    <motion.div
      className={cn(
        'relative flex items-center h-10 px-3 rounded-lg border bg-background transition-all',
        isFocused ? 'border-primary ring-2 ring-primary/20' : 'border-input',
        className
      )}
      animate={shouldReduceMotion ? {} : {
        scale: isFocused ? 1.01 : 1,
      }}
      transition={spring.snappy}
    >
      <motion.span
        animate={shouldReduceMotion ? {} : {
          scale: isFocused ? 1.1 : 1,
          rotate: isFocused ? [0, 15, -15, 0] : 0,
        }}
        transition={spring.snappy}
      >
        <Search className="w-4 h-4 text-muted-foreground" />
      </motion.span>
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 ml-2 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
      />

      {/* Clear button */}
      <AnimatePresence>
        {value && (
          <motion.button
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0 }}
            transition={spring.bouncy}
            onClick={() => onChange('')}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Loading spinner */}
      {loading && (
        <motion.div
          className="ml-2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
};

// ============================================
// ANIMATED CHECKBOX
// ============================================

interface AnimatedCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const AnimatedCheckbox: React.FC<AnimatedCheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <label className={cn(
      'flex items-center gap-2 cursor-pointer select-none',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}>
      <motion.button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
          checked
            ? 'bg-primary border-primary'
            : 'bg-background border-input hover:border-primary/50'
        )}
        whileHover={shouldReduceMotion || disabled ? {} : { scale: 1.1 }}
        whileTap={shouldReduceMotion || disabled ? {} : { scale: 0.9 }}
      >
        <AnimatePresence>
          {checked && (
            <motion.svg
              initial={shouldReduceMotion ? {} : { scale: 0, opacity: 0 }}
              animate={shouldReduceMotion ? {} : { scale: 1, opacity: 1 }}
              exit={shouldReduceMotion ? {} : { scale: 0, opacity: 0 }}
              transition={spring.bouncy}
              className="w-3 h-3 text-primary-foreground"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <motion.path
                d="M2 6L5 9L10 3"
                initial={shouldReduceMotion ? {} : { pathLength: 0 }}
                animate={shouldReduceMotion ? {} : { pathLength: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
};

// ============================================
// ANIMATED SWITCH
// ============================================

interface AnimatedSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export const AnimatedSwitch: React.FC<AnimatedSwitchProps> = ({
  checked,
  onChange,
  label,
  disabled,
  size = 'default',
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const sizeStyles = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translateX: 16 },
    default: { track: 'w-11 h-6', thumb: 'w-5 h-5', translateX: 20 },
    lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translateX: 28 },
  };

  const styles = sizeStyles[size];

  return (
    <label className={cn(
      'flex items-center gap-2 cursor-pointer select-none',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative rounded-full transition-colors',
          styles.track,
          checked ? 'bg-primary' : 'bg-input'
        )}
      >
        <motion.span
          className={cn(
            'absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm',
            styles.thumb
          )}
          animate={shouldReduceMotion ? {} : {
            x: checked ? styles.translateX : 0,
          }}
          transition={spring.snappy}
        />
      </button>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
};

export default AnimatedInput;
