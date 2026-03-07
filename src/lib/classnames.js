import clsx from 'clsx';

export const cn = (...args) => clsx(args);

export const conditionalClasses = {
  button: (variant = 'primary', size = 'md') => {
    const baseStyles = 'btn transition-all duration-200 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      danger: 'btn-secondary',
      success: 'btn-secondary',
      outline: 'btn-secondary',
      ghost: 'text-ink hover:bg-surface-light',
    };
    const sizes = {
      sm: 'px-3 py-1 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };
    return cn(baseStyles, variants[variant], sizes[size]);
  },

  badge: (variant = 'info') => {
    return 'badge';
  },

  card: (variant = 'default', interactive = false) => {
    const baseStyles = 'card p-5 transition-all duration-300';
    const interactiveStyles = interactive ? 'cursor-pointer' : '';
    return cn(baseStyles, interactiveStyles);
  },

  input: (error = false, disabled = false) => {
    const baseStyles = 'input';
    const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';
    return cn(baseStyles, disabledStyles);
  },

  status: (status) => 'text-ink',

  skeleton: (width = 'w-full', height = 'h-4') => cn('skeleton', width, height, 'rounded'),
};

export default cn;
