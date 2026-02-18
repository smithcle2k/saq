import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

type TransitionType = 'fade' | 'slide' | 'scale' | 'slideUp';

interface PageTransitionProps {
  children: React.ReactNode;
  keyProp: string;
  type?: TransitionType;
  duration?: number;
  className?: string;
}

const transitions: Record<TransitionType, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
};

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  keyProp,
  type = 'fade',
  duration = 0.2,
  className = '',
}) => {
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const transitionConfig = {
    type: 'tween',
    duration: prefersReducedMotion ? 0 : duration,
    ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={keyProp}
        variants={transitions[type]}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transitionConfig}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Staggered children animation wrapper
interface StaggeredListProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  staggerDelay = 0.05,
  className = '',
}) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Individual staggered item
interface StaggeredItemProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggeredItem: React.FC<StaggeredItemProps> = ({
  children,
  className = '',
}) => {
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
};

// Animated presence wrapper for conditional rendering
interface AnimatedPresenceWrapperProps {
  show: boolean;
  children: React.ReactNode;
  type?: TransitionType;
}

export const AnimatedPresenceWrapper: React.FC<AnimatedPresenceWrapperProps> = ({
  show,
  children,
  type = 'fade',
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          variants={transitions[type]}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Export AnimatePresence for use in App.tsx
export { AnimatePresence };
