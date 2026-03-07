import React from 'react';
import { cn, conditionalClasses } from '../lib/classnames';

const Card = React.forwardRef(
  (
    {
      variant = 'default',
      interactive = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          conditionalClasses.card(variant, interactive),
          'animate-rise-in',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('card-header mb-4 pb-4 border-b border-white/[0.06]', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn('card-title text-lg font-semibold text-ink', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('card-content', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mt-4 pt-4 border-t border-white/[0.06] flex gap-2', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
export default Card;
