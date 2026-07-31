type AvatarSize = 'sm' | 'md' | 'lg';
type AvatarVariant = 'neutral' | 'waiting' | 'in_progress' | 'ready' | 'delayed';

interface AvatarProps {
  initials: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const variantStyles: Record<AvatarVariant, string> = {
  neutral: 'bg-bg-canvas text-text-primary',
  waiting: 'bg-status-waiting-bg text-status-waiting-text',
  in_progress: 'bg-status-progress-bg text-status-progress-text',
  ready: 'bg-status-ready-bg text-status-ready-text',
  delayed: 'bg-status-delayed-bg text-status-delayed-text',
};

export function Avatar({
  initials,
  size = 'md',
  variant = 'neutral',
  className = '',
}: AvatarProps) {
  const baseStyles = 'flex items-center justify-center rounded-full font-medium';
  
  return (
    <div className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {initials.toUpperCase()}
    </div>
  );
}
