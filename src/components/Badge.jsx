import React from 'react';
import { cn, conditionalClasses } from '../lib/classnames';

const Badge = React.forwardRef(
  (
    {
      variant = 'info',
      dot = false,
      icon: Icon,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          conditionalClasses.badge(variant),
          className
        )}
        {...props}
      >
        {dot && <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />}
        {Icon && <Icon className="w-3 h-3 mr-1" />}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
