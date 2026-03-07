import React from 'react';
import { cn, conditionalClasses } from '../lib/classnames';

const Input = React.forwardRef(
  (
    {
      label,
      error,
      disabled = false,
      icon: Icon,
      className,
      helperText,
      ...props
    },
    ref
  ) => {
    return (
      <div className="form-group">
        {label && (
          <label className="form-label text-sm font-medium text-ink-secondary mb-2">
            {label}
            {props.required && <span className="text-accent-danger">*</span>}
          </label>
        )}

        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary">
              <Icon className="w-5 h-5" />
            </div>
          )}

          <input
            ref={ref}
            disabled={disabled}
            className={cn(
              conditionalClasses.input(!!error, disabled),
              Icon ? 'pl-10' : '',
              className
            )}
            {...props}
          />
        </div>

        {error && (
          <p className="mt-1 text-xs text-accent-danger">{error}</p>
        )}

        {helperText && !error && (
          <p className="mt-1 text-xs text-ink-quaternary">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
