import clsx from 'clsx';

export const cn = (...args) => clsx(args);

export const conditionalClasses = {
  button: (variant = 'primary', size = 'md') => {
    const baseStyles = 'btn-text flex items-center justify-center transition-all duration-300 font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20',
      secondary: 'bg-white/5 hover:bg-white/10 text-ink border border-white/10',
      danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30',
      success: 'bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30',
      outline: 'bg-transparent border border-white/20 hover:border-white/40 text-ink',
      ghost: 'text-ink-secondary hover:text-ink hover:bg-white/5',
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3.5 text-base',
    };
    return cn(baseStyles, variants[variant], sizes[size]);
  },

  badge: (variant = 'info') => {
    const base = 'badge flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md';
    const variants = {
      info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      success: 'bg-green-500/10 text-green-400 border border-green-500/20',
      warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      error: 'bg-red-500/10 text-red-400 border border-red-500/20',
    };
    return cn(base, variants[variant]);
  },

  card: (variant = 'default', interactive = false) => {
    const baseStyles = 'card p-5 sm:p-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-2xl transition-all duration-500';
    const interactiveStyles = interactive ? 'cursor-pointer hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40' : '';
    return cn(baseStyles, interactiveStyles);
  },

  input: (error = false, disabled = false) => {
    const baseStyles = 'input-text w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-300 placeholder:text-ink-quaternary';
    const errorStyles = error ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500/50' : '';
    const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed grayscale' : '';
    return cn(baseStyles, errorStyles, disabledStyles);
  },

  status: (status) => 'text-ink-secondary font-medium',

  skeleton: (width = 'w-full', height = 'h-4') => cn('skeleton bg-white/5 animate-pulse', width, height, 'rounded-lg'),
};

export default cn;
