/**
 * Animated Sidebar Component
 * 
 * Features:
 * - Smooth width expansion animation
 * - Icon and text stagger reveal
 * - Animated hover highlights
 * - Left border indicator slide-in
 * - Collapsible with smooth transitions
 */

import React, { ReactNode, useState, createContext, useContext } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { spring, duration, easing } from '@/lib/motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================
// CONTEXT
// ============================================

interface SidebarContextType {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('Sidebar components must be used within AnimatedSidebarProvider');
  }
  return context;
};

// ============================================
// SIDEBAR PROVIDER
// ============================================

interface AnimatedSidebarProviderProps {
  children: ReactNode;
  defaultExpanded?: boolean;
}

export const AnimatedSidebarProvider: React.FC<AnimatedSidebarProviderProps> = ({
  children,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  return (
    <SidebarContext.Provider value={{ isExpanded, setIsExpanded, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

// ============================================
// ANIMATED SIDEBAR
// ============================================

interface AnimatedSidebarProps {
  children: ReactNode;
  className?: string;
  collapsedWidth?: number;
  expandedWidth?: number;
}

export const AnimatedSidebar: React.FC<AnimatedSidebarProps> = ({
  children,
  className,
  collapsedWidth = 64,
  expandedWidth = 280,
}) => {
  const { isExpanded } = useSidebarContext();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.aside
      className={cn(
        'relative flex flex-col h-full bg-card border-r border-border overflow-hidden',
        className
      )}
      initial={false}
      animate={shouldReduceMotion ? {} : {
        width: isExpanded ? expandedWidth : collapsedWidth,
      }}
      transition={{
        duration: duration.normal,
        ease: easing.easeInOut,
      }}
    >
      {/* Gradient background effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      {children}
    </motion.aside>
  );
};

// ============================================
// SIDEBAR HEADER
// ============================================

interface AnimatedSidebarHeaderProps {
  children?: ReactNode;
  logo?: ReactNode;
  title?: string;
  className?: string;
}

export const AnimatedSidebarHeader: React.FC<AnimatedSidebarHeaderProps> = ({
  children,
  logo,
  title,
  className,
}) => {
  const { isExpanded } = useSidebarContext();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn('flex items-center gap-3 p-4 border-b border-border', className)}>
      {logo && (
        <motion.div
          className="flex-shrink-0"
          whileHover={shouldReduceMotion ? {} : { scale: 1.05, rotate: 5 }}
          transition={spring.snappy}
        >
          {logo}
        </motion.div>
      )}
      
      <AnimatePresence mode="wait">
        {isExpanded && title && (
          <motion.span
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
            transition={{ duration: duration.fast }}
            className="font-semibold text-lg truncate"
          >
            {title}
          </motion.span>
        )}
      </AnimatePresence>
      
      {children}
    </div>
  );
};

// ============================================
// SIDEBAR CONTENT
// ============================================

interface AnimatedSidebarContentProps {
  children: ReactNode;
  className?: string;
}

export const AnimatedSidebarContent: React.FC<AnimatedSidebarContentProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('flex-1 overflow-y-auto py-4', className)}>
      {children}
    </div>
  );
};

// ============================================
// SIDEBAR GROUP
// ============================================

interface AnimatedSidebarGroupProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export const AnimatedSidebarGroup: React.FC<AnimatedSidebarGroupProps> = ({
  children,
  title,
  className,
}) => {
  const { isExpanded } = useSidebarContext();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn('px-3 mb-4', className)}>
      <AnimatePresence mode="wait">
        {isExpanded && title && (
          <motion.p
            initial={shouldReduceMotion ? {} : { opacity: 0, y: -5 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, y: -5 }}
            transition={{ duration: duration.fast }}
            className="px-3 mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            {title}
          </motion.p>
        )}
      </AnimatePresence>
      
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
};

// ============================================
// SIDEBAR ITEM
// ============================================

interface AnimatedSidebarItemProps {
  icon: ReactNode;
  label: string;
  isActive?: boolean;
  badge?: string | number;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export const AnimatedSidebarItem: React.FC<AnimatedSidebarItemProps> = ({
  icon,
  label,
  isActive = false,
  badge,
  onClick,
  className,
}) => {
  const { isExpanded } = useSidebarContext();
  const shouldReduceMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      className={cn(
        'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
        'text-muted-foreground hover:text-foreground',
        isActive && 'text-primary bg-primary/10',
        !isActive && 'hover:bg-muted/50',
        className
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={shouldReduceMotion ? {} : { x: 4 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
      transition={spring.snappy}
    >
      {/* Active indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
            initial={shouldReduceMotion ? {} : { scaleY: 0, opacity: 0 }}
            animate={shouldReduceMotion ? {} : { scaleY: 1, opacity: 1 }}
            exit={shouldReduceMotion ? {} : { scaleY: 0, opacity: 0 }}
            transition={spring.snappy}
          />
        )}
      </AnimatePresence>

      {/* Hover background */}
      <AnimatePresence>
        {isHovered && !isActive && (
          <motion.div
            className="absolute inset-0 bg-muted/50 rounded-lg -z-10"
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
            transition={{ duration: duration.fast }}
          />
        )}
      </AnimatePresence>

      {/* Icon */}
      <motion.span
        className={cn(
          'flex-shrink-0',
          isActive && 'text-primary'
        )}
        animate={shouldReduceMotion ? {} : {
          scale: isActive || isHovered ? 1.1 : 1,
        }}
        transition={spring.snappy}
      >
        {icon}
      </motion.span>

      {/* Label */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.span
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
            transition={{ duration: duration.fast }}
            className="flex-1 text-left font-medium truncate"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Badge */}
      <AnimatePresence>
        {isExpanded && badge !== undefined && (
          <motion.span
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0 }}
            transition={spring.bouncy}
            className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {badge}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// ============================================
// SIDEBAR TOGGLE
// ============================================

interface AnimatedSidebarToggleProps {
  className?: string;
}

export const AnimatedSidebarToggle: React.FC<AnimatedSidebarToggleProps> = ({
  className,
}) => {
  const { isExpanded, toggleSidebar } = useSidebarContext();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      className={cn(
        'absolute top-4 -right-3 z-10 p-1.5 rounded-full',
        'bg-background border border-border shadow-md',
        'hover:bg-muted transition-colors',
        className
      )}
      onClick={toggleSidebar}
      whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
      transition={spring.snappy}
    >
      <motion.span
        animate={shouldReduceMotion ? {} : { rotate: isExpanded ? 0 : 180 }}
        transition={spring.snappy}
        className="block"
      >
        <ChevronLeft className="w-4 h-4" />
      </motion.span>
    </motion.button>
  );
};

// ============================================
// SIDEBAR FOOTER
// ============================================

interface AnimatedSidebarFooterProps {
  children: ReactNode;
  className?: string;
}

export const AnimatedSidebarFooter: React.FC<AnimatedSidebarFooterProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('p-4 border-t border-border', className)}>
      {children}
    </div>
  );
};

// ============================================
// SIDEBAR SEPARATOR
// ============================================

export const AnimatedSidebarSeparator: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div className={cn('my-2 mx-3 h-px bg-border', className)} />
  );
};

export default AnimatedSidebar;
