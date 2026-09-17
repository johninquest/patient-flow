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

  /**
   * Resolve the actor's display name.
   *
   * Prefers the `actor_name` snapshot stored on the entry, which is correct for
   * every actor: the live staff lookup below only covers active assignable
   * accounts, so a suspended or deleted actor would otherwise show a truncated
   * id. The lookup remains as a fallback for rows written before snapshots
   * existed and not yet backfilled.
   */
  const resolveUserName = (userId: string | null): string => {
    if (!userId) return t('audit.unknownActor');
    const member = staff?.find((m) => m.id === userId);
    return member ? member.name || member.email : `${userId.substring(0, 8)}\u2026`;
  };

  const actorLabel = (log: AuditLog): string =>
    log.actor_name || resolveUserName(log.actor_user_id);

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-lg font-medium text-text-primary">{title}</h3>
      )}
      {logs.map((log) => (
        <AuditActivityCard
          key={log.id}
          log={log}
          actorName={actorLabel(log)}
          resolveUserName={resolveUserName}
        />
      ))}
    </div>
  );
}
