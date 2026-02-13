/**
 * Animation Library - Centralized motion system
 * 
 * This module defines a consistent animation system with:
 * - Duration scales
 * - Easing curves  
 * - Spring configurations
 * - Variant presets for common animations
 */

import { Variants, Transition } from 'framer-motion';

// ============================================
// DURATION SCALE
// ============================================
export const duration = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.7,
  slowest: 1.0,
} as const;

// ============================================
// EASING CURVES
// ============================================
export const easing = {
  // Standard easings
  easeOut: [0.0, 0.0, 0.2, 1.0] as const,
  easeIn: [0.4, 0.0, 1.0, 1.0] as const,
  easeInOut: [0.4, 0.0, 0.2, 1.0] as const,
  
  // Expressive easings
  spring: [0.175, 0.885, 0.32, 1.275] as const,
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
  smooth: [0.25, 0.1, 0.25, 1.0] as const,
  
  // Sharp for UI elements
  sharp: [0.4, 0.0, 0.6, 1.0] as const,
} as const;

// ============================================
// SPRING CONFIGURATIONS
// ============================================
export const spring = {
  // Snappy spring for buttons and UI
  snappy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25,
    mass: 1,
  },
  
  // Bouncy spring for playful elements
  bouncy: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 15,
    mass: 1,
  },
  
  // Gentle spring for larger elements
  gentle: {
    type: 'spring' as const,
    stiffness: 150,
    damping: 20,
    mass: 1,
  },
  
  // Stiff spring for quick feedback
  stiff: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 30,
    mass: 1,
  },
  
  // Soft spring for floating elements
  soft: {
    type: 'spring' as const,
    stiffness: 100,
    damping: 15,
    mass: 1,
  },
} as const;

// ============================================
// TRANSITION PRESETS
// ============================================
export const transition = {
  default: {
    duration: duration.normal,
    ease: easing.easeOut,
  },
  
  fast: {
    duration: duration.fast,
    ease: easing.easeOut,
  },
  
  slow: {
    duration: duration.slow,
    ease: easing.smooth,
  },
  
  spring: spring.snappy,
  
  springBouncy: spring.bouncy,
  
  springGentle: spring.gentle,
} as const;

// ============================================
// STAGGER CONFIGURATION
// ============================================
export const stagger = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.15,
} as const;

// ============================================
// FADE VARIANTS
// ============================================
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: transition.default,
  },
  exit: { 
    opacity: 0,
    transition: transition.fast,
  },
};

// ============================================
// FADE UP VARIANTS (Page transitions)
// ============================================
export const fadeUpVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.easeOut,
    },
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: {
      duration: duration.fast,
      ease: easing.easeIn,
    },
  },
};

// ============================================
// SCALE VARIANTS
// ============================================
export const scaleVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: spring.snappy,
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: transition.fast,
  },
};

// ============================================
// SLIDE VARIANTS
// ============================================
export const slideVariants = {
  left: {
    hidden: { opacity: 0, x: -30 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { duration: duration.normal, ease: easing.easeOut } 
    },
    exit: { opacity: 0, x: 30, transition: transition.fast },
  } as Variants,
  
  right: {
    hidden: { opacity: 0, x: 30 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { duration: duration.normal, ease: easing.easeOut } 
    },
    exit: { opacity: 0, x: -30, transition: transition.fast },
  } as Variants,
  
  up: {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: duration.normal, ease: easing.easeOut } 
    },
    exit: { opacity: 0, y: -30, transition: transition.fast },
  } as Variants,
  
  down: {
    hidden: { opacity: 0, y: -30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: duration.normal, ease: easing.easeOut } 
    },
    exit: { opacity: 0, y: 30, transition: transition.fast },
  } as Variants,
};

// ============================================
// STAGGER CONTAINER VARIANTS
// ============================================
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger.normal,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: stagger.fast,
      staggerDirection: -1,
    },
  },
};

// ============================================
// STAGGER ITEM VARIANTS
// ============================================
export const staggerItemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: spring.snappy,
  },
  exit: { 
    opacity: 0, 
    y: -10,
    scale: 0.95,
    transition: transition.fast,
  },
};

// ============================================
// CARD HOVER VARIANTS
// ============================================
export const cardHoverVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    transition: spring.gentle,
  },
  hover: {
    scale: 1.02,
    y: -5,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    transition: spring.snappy,
  },
  tap: {
    scale: 0.98,
    transition: spring.stiff,
  },
};

// ============================================
// BUTTON VARIANTS
// ============================================
export const buttonVariants: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: spring.snappy,
  },
  tap: {
    scale: 0.95,
    transition: spring.stiff,
  },
};

// ============================================
// MENU VARIANTS
// ============================================
export const menuVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: duration.fast,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: {
      duration: duration.instant,
    },
  },
};

// ============================================
// TAB INDICATOR VARIANTS
// ============================================
export const tabIndicatorVariants: Variants = {
  inactive: {
    scale: 0.95,
    opacity: 0,
  },
  active: {
    scale: 1,
    opacity: 1,
    transition: spring.snappy,
  },
};

// ============================================
// SIDEBAR VARIANTS
// ============================================
export const sidebarVariants: Variants = {
  collapsed: {
    width: 64,
    transition: {
      duration: duration.normal,
      ease: easing.easeInOut,
    },
  },
  expanded: {
    width: 280,
    transition: {
      duration: duration.normal,
      ease: easing.easeInOut,
    },
  },
};

// ============================================
// CHART ANIMATION VARIANTS
// ============================================
export const chartBarVariants: Variants = {
  hidden: {
    scaleY: 0,
    originY: 1,
  },
  visible: (custom: number) => ({
    scaleY: 1,
    transition: {
      delay: custom * 0.1,
      duration: duration.slow,
      ease: easing.easeOut,
    },
  }),
};

export const chartLineVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: duration.slowest,
        ease: easing.easeInOut,
      },
      opacity: {
        duration: duration.fast,
      },
    },
  },
};

export const chartPieVariants: Variants = {
  hidden: {
    scale: 0,
    rotate: -90,
    opacity: 0,
  },
  visible: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      duration: duration.slow,
      ease: easing.spring,
    },
  },
};

// ============================================
// TOAST VARIANTS
// ============================================
export const toastVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: spring.bouncy,
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.9,
    transition: transition.fast,
  },
};

// ============================================
// MODAL / DIALOG VARIANTS
// ============================================
export const modalOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: duration.fast },
  },
  exit: { 
    opacity: 0,
    transition: { duration: duration.fast, delay: 0.1 },
  },
};

export const modalContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: spring.snappy,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: transition.fast,
  },
};

// ============================================
// ROW / LIST ITEM VARIANTS
// ============================================
export const rowVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: (custom: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: custom * 0.05,
      duration: duration.normal,
      ease: easing.easeOut,
    },
  }),
  exit: {
    opacity: 0,
    x: 20,
    transition: transition.fast,
  },
};

// ============================================
// NUMBER COUNT-UP CONFIG
// ============================================
export const countUpConfig = {
  duration: 1.5,
  delay: 0.2,
  ease: easing.easeOut,
};

// ============================================
// REDUCED MOTION MEDIA QUERY
// ============================================
export const reducedMotionTransition: Transition = {
  duration: 0,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
export const createStaggerVariants = (
  delayBetween: number = stagger.normal,
  initialDelay: number = 0.1
): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: delayBetween,
      delayChildren: initialDelay,
    },
  },
});

export const createSlideVariants = (
  direction: 'up' | 'down' | 'left' | 'right',
  distance: number = 30
): Variants => {
  const isVertical = direction === 'up' || direction === 'down';
  const isNegative = direction === 'up' || direction === 'left';
  const value = isNegative ? distance : -distance;
  
  if (isVertical) {
    return {
      hidden: { opacity: 0, y: value },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: duration.normal, ease: easing.easeOut },
      },
      exit: { 
        opacity: 0, 
        y: isNegative ? -value/2 : value/2,
        transition: transition.fast,
      },
    };
  } else {
    return {
      hidden: { opacity: 0, x: value },
      visible: { 
        opacity: 1, 
        x: 0,
        transition: { duration: duration.normal, ease: easing.easeOut },
      },
      exit: { 
        opacity: 0, 
        x: isNegative ? -value/2 : value/2,
        transition: transition.fast,
      },
    };
  }
};
