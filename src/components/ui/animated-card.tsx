/**
 * Animated Card Components
 * 
 * Features:
 * - Lift effect with shadow on hover
 * - Subtle 3D tilt effect
 * - Glass morphism variant
 * - Gradient border variant
 * - Staggered entrance animations
 */

import React, { useRef, ReactNode, useState, MouseEvent } from 'react';
import { motion, useReducedMotion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { spring, staggerItemVariants } from '@/lib/motion';

// ============================================
// ANIMATED CARD
// ============================================

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient' | 'elevated' | 'outlined';
  hover?: 'lift' | 'glow' | 'tilt' | 'none';
  onClick?: () => void;
  delay?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className,
  variant = 'default',
  hover = 'lift',
  onClick,
  delay = 0,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D Tilt effect
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  
  const rotateX = useSpring(useTransform(y, [0, 1], [5, -5]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-5, 5]), { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (hover !== 'tilt' || shouldReduceMotion || !cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const xPos = (e.clientX - rect.left) / rect.width;
    const yPos = (e.clientY - rect.top) / rect.height;
    
    x.set(xPos);
    y.set(yPos);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  // Variant styles
  const variantStyles = {
    default: 'bg-card border border-border shadow-sm',
    glass: 'glass-card backdrop-blur-xl',
    gradient: 'bg-card border-0 before:absolute before:inset-0 before:-z-10 before:rounded-xl before:p-[1px] before:bg-gradient-to-br before:from-primary/50 before:via-accent/50 before:to-primary/50',
    elevated: 'bg-card border-0 shadow-lg shadow-black/5',
    outlined: 'bg-transparent border-2 border-border',
  };

  // Hover styles
  const hoverVariants = {
    lift: {
      rest: { y: 0, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
      hover: { y: -8, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' },
    },
    glow: {
      rest: { boxShadow: '0 0 0px rgba(99, 102, 241, 0)' },
      hover: { boxShadow: '0 0 30px rgba(99, 102, 241, 0.3)' },
    },
    tilt: {
      rest: {},
      hover: {},
    },
    none: {
      rest: {},
      hover: {},
    },
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        'relative rounded-xl overflow-hidden',
        variantStyles[variant],
        onClick && 'cursor-pointer',
        className
      )}
      initial="rest"
      whileHover={shouldReduceMotion ? undefined : "hover"}
      whileTap={onClick && !shouldReduceMotion ? { scale: 0.98 } : undefined}
      variants={hoverVariants[hover]}
      transition={spring.gentle}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={hover === 'tilt' && !shouldReduceMotion ? {
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      } : undefined}
    >
      {/* Gradient shimmer on hover for gradient variant */}
      {variant === 'gradient' && !shouldReduceMotion && (
        <motion.div
          className="absolute inset-0 -z-5 opacity-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: '-100%', opacity: 0 }}
          whileHover={{ x: '100%', opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      )}
      
      {children}
    </motion.div>
  );
};

// ============================================
// ANIMATED CARD HEADER
// ============================================

interface AnimatedCardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const AnimatedCardHeader: React.FC<AnimatedCardHeaderProps> = ({
  children,
  className,
}) => {
  return (
    <motion.div
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      variants={staggerItemVariants}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// ANIMATED CARD TITLE
// ============================================

interface AnimatedCardTitleProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
}

export const AnimatedCardTitle: React.FC<AnimatedCardTitleProps> = ({
  children,
  className,
  gradient = false,
}) => {
  return (
    <motion.h3
      className={cn(
        'text-2xl font-semibold leading-none tracking-tight',
        gradient && 'text-gradient',
        className
      )}
      variants={staggerItemVariants}
    >
      {children}
    </motion.h3>
  );
};

// ============================================
// ANIMATED CARD DESCRIPTION
// ============================================

interface AnimatedCardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export const AnimatedCardDescription: React.FC<AnimatedCardDescriptionProps> = ({
  children,
  className,
}) => {
  return (
    <motion.p
      className={cn('text-sm text-muted-foreground', className)}
      variants={staggerItemVariants}
    >
      {children}
    </motion.p>
  );
};

// ============================================
// ANIMATED CARD CONTENT
// ============================================

interface AnimatedCardContentProps {
  children: ReactNode;
  className?: string;
}

export const AnimatedCardContent: React.FC<AnimatedCardContentProps> = ({
  children,
  className,
}) => {
  return (
    <motion.div
      className={cn('p-6 pt-0', className)}
      variants={staggerItemVariants}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// ANIMATED CARD FOOTER
// ============================================

interface AnimatedCardFooterProps {
  children: ReactNode;
  className?: string;
}

export const AnimatedCardFooter: React.FC<AnimatedCardFooterProps> = ({
  children,
  className,
}) => {
  return (
    <motion.div
      className={cn('flex items-center p-6 pt-0', className)}
      variants={staggerItemVariants}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// METRIC CARD (for dashboards)
// ============================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  delay?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend = 'neutral',
  className,
  delay = 0,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const trendColors = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  return (
    <motion.div
      className={cn(
        'relative rounded-xl bg-card border border-border p-6 overflow-hidden',
        className
      )}
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay,
        ...spring.snappy,
      }}
      whileHover={shouldReduceMotion ? {} : {
        y: -5,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-2xl" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <motion.p
            className="text-3xl font-bold tracking-tight"
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.5 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.2, ...spring.bouncy }}
          >
            {value}
          </motion.p>
          {change !== undefined && (
            <motion.p
              className={cn('text-sm flex items-center gap-1', trendColors[trend])}
              initial={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.3 }}
            >
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {change > 0 ? '+' : ''}{change}%
              {changeLabel && <span className="text-muted-foreground">{changeLabel}</span>}
            </motion.p>
          )}
        </div>
        
        {icon && (
          <motion.div
            className="p-3 rounded-lg bg-primary/10 text-primary"
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0, rotate: -180 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: delay + 0.1, ...spring.bouncy }}
            whileHover={shouldReduceMotion ? {} : { scale: 1.1, rotate: 5 }}
          >
            {icon}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// CARD GRID (for staggered animations)
// ============================================

interface CardGridProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export const CardGrid: React.FC<CardGridProps> = ({
  children,
  className,
  columns = 3,
}) => {
  const shouldReduceMotion = useReducedMotion();
  
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <motion.div
      className={cn('grid gap-6', gridCols[columns], className)}
      initial="hidden"
      animate="visible"
      variants={shouldReduceMotion ? {} : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={shouldReduceMotion ? {} : staggerItemVariants}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default AnimatedCard;
