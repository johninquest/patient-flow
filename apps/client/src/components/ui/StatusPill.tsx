import { ReactNode } from 'react';

type StatusType = 'waiting' | 'in_progress' | 'ready' | 'delayed';

interface StatusPillProps {
  status: StatusType;
  label: string;
  icon?: ReactNode;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  waiting: 'bg-status-waiting-bg text-status-waiting-text',
  in_progress: 'bg-status-progress-bg text-status-progress-text',
  ready: 'bg-status-ready-bg text-status-ready-text',
  delayed: 'bg-status-delayed-bg text-status-delayed-text',
};

export function StatusPill({ status, label, icon, className = '' }: StatusPillProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium';
  
  return (
    <span className={`${baseStyles} ${statusStyles[status]} ${className}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
    </span>
  );
}
