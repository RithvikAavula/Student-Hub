/**
 * Animated Tabs Component
 * 
 * Features:
 * - Smooth sliding indicator under active tab
 * - Scale and color transitions on active tab
 * - Fade + vertical slide for tab content
 * - Staggered child component animations
 */

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { spring, duration, easing } from '@/lib/motion';

// ============================================
// TYPES
// ============================================

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface AnimatedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
  className?: string;
  tabsClassName?: string;
  contentClassName?: string;
  variant?: 'default' | 'pills' | 'underline';
}

// ============================================
// ANIMATED TABS ROOT
// ============================================

export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
  tabsClassName,
  contentClassName,
  variant = 'default',
}) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <AnimatedTabsList
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        className={tabsClassName}
        variant={variant}
      />
      <AnimatedTabsContent
        activeTab={activeTab}
        className={contentClassName}
      >
        {children}
      </AnimatedTabsContent>
    </div>
  );
};

// ============================================
// ANIMATED TABS LIST
// ============================================

interface AnimatedTabsListProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}

export const AnimatedTabsList: React.FC<AnimatedTabsListProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
  variant = 'default',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Update indicator position when active tab changes
  useEffect(() => {
    const activeTabElement = tabRefs.current.get(activeTab);
    const container = containerRef.current;
    
    if (activeTabElement && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();
      
      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeTab, tabs]);

  const variantStyles = {
    default: 'bg-muted rounded-lg p-1',
    pills: 'bg-transparent gap-2',
    underline: 'bg-transparent border-b border-border',
  };

  const tabVariantStyles = {
    default: 'rounded-md',
    pills: 'rounded-full',
    underline: 'rounded-none pb-3',
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative inline-flex items-center',
        variantStyles[variant],
        className
      )}
    >
      {/* Sliding Indicator */}
      {variant !== 'underline' && (
        <motion.div
          className={cn(
            'absolute h-[calc(100%-8px)] bg-background shadow-sm',
            variant === 'default' && 'rounded-md',
            variant === 'pills' && 'rounded-full bg-primary'
          )}
          initial={false}
          animate={shouldReduceMotion ? {} : indicatorStyle}
          transition={spring.snappy}
          style={{
            top: 4,
            ...indicatorStyle,
          }}
        />
      )}
      
      {/* Underline Indicator */}
      {variant === 'underline' && (
        <motion.div
          className="absolute bottom-0 h-0.5 bg-primary rounded-full"
          initial={false}
          animate={shouldReduceMotion ? {} : indicatorStyle}
          transition={spring.snappy}
        />
      )}

      {/* Tab Buttons */}
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          ref={(el) => {
            if (el) tabRefs.current.set(tab.id, el);
          }}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'relative z-10 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
            tabVariantStyles[variant],
            activeTab === tab.id
              ? variant === 'pills'
                ? 'text-primary-foreground'
                : 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
          animate={shouldReduceMotion ? {} : {
            scale: activeTab === tab.id ? 1.02 : 1,
          }}
          transition={spring.snappy}
        >
          {tab.icon && (
            <motion.span
              animate={shouldReduceMotion ? {} : {
                scale: activeTab === tab.id ? 1.1 : 1,
              }}
              transition={spring.snappy}
            >
              {tab.icon}
            </motion.span>
          )}
          <span>{tab.label}</span>
          {tab.badge !== undefined && (
            <motion.span
              className={cn(
                'ml-1 px-1.5 py-0.5 text-xs rounded-full',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted-foreground/20 text-muted-foreground'
              )}
              animate={shouldReduceMotion ? {} : {
                scale: activeTab === tab.id ? 1.1 : 1,
              }}
              transition={spring.snappy}
            >
              {tab.badge}
            </motion.span>
          )}
        </motion.button>
      ))}
    </div>
  );
};

// ============================================
// ANIMATED TABS CONTENT
// ============================================

interface AnimatedTabsContentProps {
  activeTab: string;
  children: ReactNode;
  className?: string;
}

export const AnimatedTabsContent: React.FC<AnimatedTabsContentProps> = ({
  activeTab,
  children,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn('relative mt-4', className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
          transition={{
            duration: duration.normal,
            ease: easing.easeOut,
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ============================================
// ANIMATED TAB PANEL (for individual content)
// ============================================

interface AnimatedTabPanelProps {
  value: string;
  activeTab: string;
  children: ReactNode;
  className?: string;
  staggerChildren?: boolean;
}

export const AnimatedTabPanel: React.FC<AnimatedTabPanelProps> = ({
  value,
  activeTab,
  children,
  className,
  staggerChildren = true,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (value !== activeTab) return null;

  if (staggerChildren && !shouldReduceMotion) {
    return (
      <motion.div
        className={className}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05,
              delayChildren: 0.1,
            },
          },
          exit: { opacity: 0 },
        }}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={className}>{children}</div>;
};

// ============================================
// STAGGER ITEM (for use within AnimatedTabPanel)
// ============================================

interface StaggerChildProps {
  children: ReactNode;
  className?: string;
}

export const StaggerChild: React.FC<StaggerChildProps> = ({
  children,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 15, scale: 0.98 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: spring.snappy,
        },
        exit: { opacity: 0, y: -10, scale: 0.98 },
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedTabs;
