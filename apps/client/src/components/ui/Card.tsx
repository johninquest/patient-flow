import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const baseStyles = 'bg-bg-surface border border-border-default rounded-[var(--radius-card)]';
  
  return (
    <div className={`${baseStyles} ${paddingStyles[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
}
