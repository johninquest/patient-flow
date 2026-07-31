import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  linkTo?: string;
  linkLabel?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  icon,
  linkTo,
  linkLabel,
  className = '',
}: MetricCardProps) {
  const baseStyles = 'bg-bg-surface border border-border-default rounded-[var(--radius-card)] p-4';
  
  return (
    <div className={`${baseStyles} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-text-secondary mb-1">{label}</p>
          <p className="text-xl font-medium text-text-primary">{value}</p>
        </div>
        {icon && (
          <div className="flex-shrink-0 text-text-secondary">
            {icon}
          </div>
        )}
      </div>
      {linkTo && linkLabel && (
        <div className="mt-3 pt-3 border-t border-border-default">
          <Link
            to={linkTo}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            {linkLabel} →
          </Link>
        </div>
      )}
    </div>
  );
}
