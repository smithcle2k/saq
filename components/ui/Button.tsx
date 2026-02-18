import React, { forwardRef, useState, useCallback } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface RipplePosition {
  x: number;
  y: number;
  id: number;
}

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
  glow?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-surface hover:bg-primary/90 shadow-elevation-2 hover:shadow-glow-primary',
  secondary: 'bg-surface-container-high text-on-surface border border-outline hover:bg-surface-container-highest',
  ghost: 'bg-transparent text-on-surface hover:bg-surface-container',
  danger: 'bg-phase-rest-DEFAULT text-white hover:bg-phase-rest-DEFAULT/90',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-label-medium rounded-lg gap-1',
  md: 'px-4 py-2 text-label-large rounded-xl gap-2',
  lg: 'px-6 py-3 text-title-medium rounded-2xl gap-2',
  xl: 'px-8 py-4 text-title-large rounded-3xl gap-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      fullWidth = false,
      loading = false,
      glow = false,
      className = '',
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<RipplePosition[]>([]);

    const createRipple = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const id = Date.now();

        setRipples((prev) => [...prev, { x, y, id }]);

        setTimeout(() => {
          setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
        }, 600);
      },
      []
    );

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled && !loading) {
          createRipple(event);
          onClick?.(event);
        }
      },
      [disabled, loading, createRipple, onClick]
    );

    return (
      <motion.button
        ref={ref}
        className={`
          relative overflow-hidden inline-flex items-center justify-center
          font-medium transition-colors duration-200 touch-manipulation
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${glow && variant === 'primary' ? 'shadow-glow-primary' : ''}
          ${className}
        `}
        disabled={disabled || loading}
        onClick={handleClick}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        {...props}
      >
        {/* Ripple effects */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 animate-[ripple_0.6s_ease-out]"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)',
              width: 0,
              height: 0,
            }}
          />
        ))}

        {/* Loading spinner */}
        {loading && (
          <motion.span
            className="absolute inset-0 flex items-center justify-center bg-inherit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </motion.span>
        )}

        {/* Content */}
        <span
          className={`inline-flex items-center gap-inherit ${loading ? 'invisible' : ''}`}
        >
          {icon && iconPosition === 'left' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
        </span>

        {/* Shimmer overlay for primary buttons */}
        {variant === 'primary' && !disabled && (
          <motion.span
            className="absolute inset-0 shimmer opacity-0 hover:opacity-100 transition-opacity"
            initial={false}
          />
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

// Add ripple keyframe to the component (will be handled by Tailwind JIT)
const rippleKeyframes = `
@keyframes ripple {
  to {
    width: 300px;
    height: 300px;
    opacity: 0;
  }
}
`;

// Inject keyframes if not already present
if (typeof document !== 'undefined') {
  const styleId = 'button-ripple-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = rippleKeyframes;
    document.head.appendChild(style);
  }
}
