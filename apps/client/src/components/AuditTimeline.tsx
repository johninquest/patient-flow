import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card } from './ui';
import { api } from '../lib/api/client';
import type { AuditLog, AssignableUser } from '../lib/types/flow.types';
import { AuditActivityCard } from './AuditActivityCard';

interface AuditTimelineProps {
  logs: AuditLog[];
  title?: string;
}

export function AuditTimeline({ logs, title }: AuditTimelineProps) {
  const { t } = useTranslation();

  // Resolve actor IDs to display names. Cached across every timeline on screen.
  const { data: staff } = useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: () => api.get<AssignableUser[]>('/api/users/assignable'),
  });

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-secondary text-center py-4">
          {t('audit.noActivity')}
        </p>
      </Card>
    );
  }

  const resolveUserName = (userId: string): string => {
    const member = staff?.find((m) => m.id === userId);
    return member ? member.name || member.email : `${userId.substring(0, 8)}\u2026`;
  };

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-lg font-medium text-text-primary">{title}</h3>
      )}
      {logs.map((log) => (
        <AuditActivityCard
          key={log.id}
          log={log}
          actorName={resolveUserName(log.actor_user_id)}
          resolveUserName={resolveUserName}
        />
      ))}
    </div>
  );
}
