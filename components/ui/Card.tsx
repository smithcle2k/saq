import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-surface-container border border-outline-variant',
  elevated: 'bg-surface-container-high shadow-elevation-2 border border-outline-variant',
  outlined: 'bg-transparent border-2 border-outline',
  glass: 'glass',
};

const paddingStyles = {
  none: '',
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      interactive = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const interactiveProps = interactive
      ? {
          whileHover: { scale: 1.01, y: -2 },
          whileTap: { scale: 0.99 },
          transition: { type: 'spring', stiffness: 400, damping: 17 },
        }
      : {};

    return (
      <motion.div
        ref={ref}
        className={`
          rounded-2xl overflow-hidden
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${interactive ? 'cursor-pointer' : ''}
          ${className}
        `}
        {...interactiveProps}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

// Card Header component
interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`px-4 py-3 border-b border-outline-variant ${className}`}>
    {children}
  </div>
);

// Card Content component
interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => (
  <div className={`p-4 ${className}`}>
    {children}
  </div>
);

// Card Footer component
interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
  <div className={`px-4 py-3 border-t border-outline-variant ${className}`}>
    {children}
  </div>
);

// Stat Card for Statistics view
interface StatCardProps extends HTMLMotionProps<'div'> {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  color?: 'primary' | 'green' | 'purple' | 'amber';
}

const colorStyles = {
  primary: 'text-primary',
  green: 'text-phase-work-DEFAULT',
  purple: 'text-phase-finished-DEFAULT',
  amber: 'text-phase-prep-DEFAULT',
};

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ icon, label, value, color = 'primary', className = '', ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={`
          glass-elevated rounded-2xl p-4
          flex items-center justify-between
          ${className}
        `}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        {...props}
      >
        <div>
          <p className="text-label-medium text-on-surface-variant uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className={`text-headline-small font-mono font-bold ${colorStyles[color]}`}>
            {value}
          </p>
        </div>
        {icon && (
          <div className="text-outline opacity-60">
            {icon}
          </div>
        )}
      </motion.div>
    );
  }
);

StatCard.displayName = 'StatCard';
