/**
 * Motion Components - Reusable animated wrapper components
 * 
 * These components provide consistent animations across the app
 * with automatic reduced-motion support.
 */

import React, { ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion, HTMLMotionProps } from 'framer-motion';
import {
  fadeUpVariants,
  scaleVariants,
  staggerContainerVariants,
  staggerItemVariants,
  cardHoverVariants,
  slideVariants,
  spring,
  duration,
  easing,
} from '@/lib/motion';

// ============================================
// MOTION WRAPPER TYPES
// ============================================

interface MotionWrapperProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
  delay?: number;
}

// ============================================
// PAGE TRANSITION
// ============================================

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={shouldReduceMotion ? {} : fadeUpVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// FADE IN COMPONENT
// ============================================

interface FadeInProps extends MotionWrapperProps {
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

export const FadeIn: React.FC<FadeInProps> = ({ 
  children, 
  className, 
  delay = 0,
  direction = 'up',
  distance = 20,
  ...props 
}) => {
  const shouldReduceMotion = useReducedMotion();
  
  const directionMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  };

  if (shouldReduceMotion) {
    return <div className={className} {...(props as any)}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: duration.normal,
        delay,
        ease: easing.easeOut,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// SCALE IN COMPONENT
// ============================================

export const ScaleIn: React.FC<MotionWrapperProps> = ({ 
  children, 
  className, 
  delay = 0,
  ...props 
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className} {...(props as any)}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={scaleVariants}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// STAGGER CONTAINER
// ============================================

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({ 
  children, 
  className,
  staggerDelay = 0.1,
  initialDelay = 0.1,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// STAGGER ITEM
// ============================================

interface StaggerItemProps extends MotionWrapperProps {}

export const StaggerItem: React.FC<StaggerItemProps> = ({ 
  children, 
  className,
  ...props 
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className} {...(props as any)}>{children}</div>;
  }

  return (
    <motion.div
      variants={staggerItemVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// ANIMATED CARD
// ============================================

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  enableHover?: boolean;
  enableTilt?: boolean;
  onClick?: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  children, 
  className,
  enableHover = true,
  enableTilt = false,
  onClick,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className} onClick={onClick}>{children}</div>;
  }

  return (
    <motion.div
      initial="rest"
      whileHover={enableHover ? "hover" : undefined}
      whileTap={onClick ? "tap" : undefined}
      variants={cardHoverVariants}
      className={className}
      onClick={onClick}
      style={{ transformStyle: enableTilt ? 'preserve-3d' : undefined }}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// SLIDE TRANSITION
// ============================================

interface SlideTransitionProps {
  children: ReactNode;
  className?: string;
  direction?: 'left' | 'right' | 'up' | 'down';
  isVisible?: boolean;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({ 
  children, 
  className,
  direction = 'left',
  isVisible = true,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={shouldReduceMotion ? {} : slideVariants[direction]}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// HOVER SCALE
// ============================================

interface HoverScaleProps {
  children: ReactNode;
  className?: string;
  scale?: number;
}

export const HoverScale: React.FC<HoverScaleProps> = ({ 
  children, 
  className,
  scale = 1.05,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.95 }}
      transition={spring.snappy}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// FLOATING ELEMENT
// ============================================

interface FloatingProps {
  children: ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
}

export const Floating: React.FC<FloatingProps> = ({ 
  children, 
  className,
  amplitude = 10,
  duration: floatDuration = 3,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      animate={{
        y: [-amplitude, amplitude, -amplitude],
      }}
      transition={{
        duration: floatDuration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// PULSE GLOW
// ============================================

interface PulseGlowProps {
  children: ReactNode;
  className?: string;
  color?: string;
}

export const PulseGlow: React.FC<PulseGlowProps> = ({ 
  children, 
  className,
  color = 'rgba(99, 102, 241, 0.4)',
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      animate={{
        boxShadow: [
          `0 0 0px ${color}`,
          `0 0 20px ${color}`,
          `0 0 0px ${color}`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// RIPPLE BUTTON EFFECT
// ============================================

interface RippleProps {
  x: number;
  y: number;
}

export const Ripple: React.FC<RippleProps> = ({ x, y }) => {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0.5 }}
      animate={{ scale: 4, opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="absolute rounded-full bg-white/30 pointer-events-none"
      style={{
        left: x,
        top: y,
        width: 20,
        height: 20,
        marginLeft: -10,
        marginTop: -10,
      }}
    />
  );
};

// ============================================
// COUNT UP ANIMATION
// ============================================

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  end,
  start = 0,
  duration: customDuration = 1.5,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = React.useState(start);
  
  React.useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(end);
      return;
    }

    const timeout = setTimeout(() => {
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / (customDuration * 1000), 1);
        
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (end - start) * eased;
        
        setDisplayValue(current);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }, delay * 1000);

    return () => clearTimeout(timeout);
  }, [end, start, customDuration, delay, shouldReduceMotion]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
};

// ============================================
// PRESENCE WRAPPER (for AnimatePresence)
// ============================================

interface PresenceWrapperProps {
  children: ReactNode;
  mode?: 'sync' | 'wait' | 'popLayout';
}

export const PresenceWrapper: React.FC<PresenceWrapperProps> = ({ 
  children, 
  mode = 'wait' 
}) => {
  return (
    <AnimatePresence mode={mode}>
      {children}
    </AnimatePresence>
  );
};

// ============================================
// ANIMATED LIST
// ============================================

interface AnimatedListProps {
  items: any[];
  renderItem: (item: any, index: number) => ReactNode;
  keyExtractor: (item: any, index: number) => string;
  className?: string;
  itemClassName?: string;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({
  items,
  renderItem,
  keyExtractor,
  className,
  itemClassName,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={className}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item, index)}
            variants={shouldReduceMotion ? {} : staggerItemVariants}
            layout
            className={itemClassName}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================
// SHIMMER SKELETON
// ============================================

interface ShimmerSkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export const ShimmerSkeleton: React.FC<ShimmerSkeletonProps> = ({
  className,
  width,
  height,
  rounded = false,
}) => {
  return (
    <motion.div
      className={`bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] ${rounded ? 'rounded-full' : 'rounded-md'} ${className}`}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{ width, height }}
    />
  );
};

// ============================================
// PROGRESS BAR ANIMATION
// ============================================

interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  value,
  max = 100,
  className,
  barClassName,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const percentage = (value / max) * 100;

  return (
    <div className={`relative h-2 overflow-hidden rounded-full bg-muted ${className}`}>
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r from-primary to-primary/80 ${barClassName}`}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={shouldReduceMotion ? { duration: 0 } : {
          duration: duration.slow,
          ease: easing.easeOut,
        }}
      />
    </div>
  );
};

// ============================================
// MORPHING BLOB BACKGROUND
// ============================================

interface MorphingBlobProps {
  className?: string;
  color?: string;
}

export const MorphingBlob: React.FC<MorphingBlobProps> = ({
  className,
  color = 'from-primary/20 to-purple-500/20',
}) => {
  return (
    <motion.div
      className={`absolute rounded-full bg-gradient-to-r ${color} blur-3xl ${className}`}
      animate={{
        borderRadius: [
          '60% 40% 30% 70% / 60% 30% 70% 40%',
          '30% 60% 70% 40% / 50% 60% 30% 60%',
          '50% 60% 30% 60% / 30% 60% 70% 40%',
          '60% 40% 60% 40% / 70% 30% 50% 60%',
          '60% 40% 30% 70% / 60% 30% 70% 40%',
        ],
        scale: [1, 1.1, 1, 0.9, 1],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

export { AnimatePresence, motion };
