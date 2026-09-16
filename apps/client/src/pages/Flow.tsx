import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api/client';
import { Card, StatusPill, LoadingSpinner, EmptyState } from '../components/ui';
import { UserIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
  type FlowEncounter,
  type EncounterStatus,
  encounterStatusToDesignSystem,
} from '../lib/types/flow.types';

/** Board columns, in the order a patient moves through them. */
const COLUMNS: { status: EncounterStatus; labelKey: string }[] = [
  { status: 'scheduled', labelKey: 'flow.columns.scheduled' },
  { status: 'checked_in', labelKey: 'flow.columns.checked_in' },
  { status: 'in_progress', labelKey: 'flow.columns.in_progress' },
  { status: 'completed', labelKey: 'flow.columns.completed' },
];

/**
 * Patient flow board — answers "where is every patient right now?".
 *
 * Polls periodically so a handoff made in one window becomes visible in
 * another without a manual refresh.
 */
export default function Flow() {
  const { t } = useTranslation();

  const { data: encounters, isLoading } = useQuery({
    queryKey: ['flow'],
    queryFn: () => api.get<FlowEncounter[]>('/api/dashboard/flow'),
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading')} className="py-12" />;
  }

  const byStatus = (status: EncounterStatus) =>
    (encounters || []).filter((encounter) => encounter.status === status);

  const total = encounters?.length || 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-text-primary">{t('flow.title')}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t('flow.description')}</p>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<UserIcon className="w-12 h-12" />}
          title={t('flow.empty.title')}
          description={t('flow.empty.description')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((column) => {
            const items = byStatus(column.status);
            return (
              <div key={column.status} className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-medium text-text-secondary">
                    {t(column.labelKey)}
                  </h2>
                  <span className="text-xs text-text-secondary">{items.length}</span>
                </div>

                <div className="space-y-3">
                  {items.length === 0 ? (
                    <Card padding="sm">
                      <p className="text-xs text-text-secondary text-center py-2">
                        {t('flow.columnEmpty')}
                      </p>
                    </Card>
                  ) : (
                    items.map((encounter) => (
                      <Link key={encounter.id} to={`/encounters/${encounter.id}`}>
                        <Card padding="sm" className="hover:bg-bg-canvas transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-medium text-text-primary">
                              {encounter.patient_name}
                            </p>
                            <StatusPill
                              status={encounterStatusToDesignSystem(encounter.status)}
                              label={t(`encounters.statuses.${encounter.status}`)}
                            />
                          </div>

                          {encounter.phase && (
                            <p className="text-xs text-text-secondary mb-2">
                              {t(`encounters.phases.${encounter.phase}`)}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                            {encounter.assigned_to_name && (
                              <span className="inline-flex items-center gap-1">
                                <UserIcon className="w-3 h-3" />
                                {encounter.assigned_to_name}
                              </span>
                            )}
                            {encounter.task_count > 0 && (
                              <span>
                                {t('flow.tasksProgress', {
                                  done: encounter.task_done_count,
                                  count: encounter.task_count,
                                })}
                              </span>
                            )}
                            {encounter.task_blocking_open_count > 0 && (
                              <span className="inline-flex items-center gap-1 text-status-delayed-text">
                                <ExclamationTriangleIcon className="w-3 h-3" />
                                {t('flow.blocked')}
                              </span>
                            )}
                          </div>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}