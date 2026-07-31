import { useTranslation } from 'react-i18next';
import { Card } from './ui';
import { ClockIcon, UserIcon } from '@heroicons/react/24/outline';

interface AuditLog {
  id: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  diff?: Record<string, { from: any; to: any }>;
  ip_address?: string;
  created_at: string;
}

interface AuditTimelineProps {
  logs: AuditLog[];
  title?: string;
}

export function AuditTimeline({ logs, title }: AuditTimelineProps) {
  const { t } = useTranslation();

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-secondary text-center py-4">
          {t('audit.noActivity', 'No activity recorded yet')}
        </p>
      </Card>
    );
  }

  const formatAction = (action: string) => {
    const parts = action.split('.');
    if (parts.length === 2) {
      return t(`audit.actions.${parts[1]}`, parts[1]);
    }
    return action;
  };

  const formatResourceType = (type: string) => {
    return t(`audit.resources.${type}`, type);
  };

  const formatDiff = (diff: Record<string, { from: any; to: any }>) => {
    const changes = Object.entries(diff).map(([field, { from, to }]) => {
      const fieldName = t(`audit.fields.${field}`, field);
      const fromValue = from === null ? t('common.empty', 'empty') : String(from);
      const toValue = to === null ? t('common.empty', 'empty') : String(to);
      return (
        <div key={field} className="text-xs text-text-secondary mt-1">
          <span className="font-medium">{fieldName}:</span>{' '}
          <span className="line-through opacity-60">{fromValue}</span> →{' '}
          <span className="font-medium">{toValue}</span>
        </div>
      );
    });
    return <div className="mt-2">{changes}</div>;
  };

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-medium text-text-primary">{title}</h3>
      )}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border-default" />
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="relative pl-12">
              <div className="absolute left-0 top-2 w-8 h-8 rounded-full bg-bg-surface border-2 border-border-default flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-text-secondary" />
              </div>
              <Card padding="sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-text-primary">
                        {log.actor_user_id.substring(0, 8)}...
                      </span>
                      <span className="text-text-secondary">
                        ({t(`roles.${log.actor_role}`, log.actor_role)})
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-text-primary">
                      {formatAction(log.action)} {formatResourceType(log.resource_type)}
                    </div>
                    {log.diff && formatDiff(log.diff)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-text-secondary whitespace-nowrap">
                    <ClockIcon className="w-3 h-3" />
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
