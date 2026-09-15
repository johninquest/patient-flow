import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { Link } from 'react-router-dom';
import { Card, StatusPill, EmptyState, LoadingSpinner, Button } from '../components/ui';
import { ClipboardDocumentListIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import {
  type Encounter,
  encounterStatusToDesignSystem,
} from '../lib/types/flow.types';

type TabType = 'upcoming' | 'inProgress' | 'completed';

const TABS: TabType[] = ['upcoming', 'inProgress', 'completed'];

/** Statuses shown under each tab. */
const TAB_STATUSES: Record<TabType, string[]> = {
  upcoming: ['scheduled'],
  inProgress: ['checked_in', 'in_progress'],
  completed: ['completed', 'cancelled', 'no_show'],
};

type DayGroup = 'today' | 'tomorrow' | 'thisWeek' | 'later';

const DAY_GROUP_ORDER: DayGroup[] = ['today', 'tomorrow', 'thisWeek', 'later'];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Buckets a scheduled time into a day group for the schedule list.
 * Encounters without a scheduled time (walk-ins) fall into `today`.
 */
function dayGroupOf(scheduledTime: string | null): DayGroup {
  if (!scheduledTime) return 'today';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + DAY_MS);
  const startOfDayAfterTomorrow = new Date(startOfToday.getTime() + 2 * DAY_MS);
  const startOfNextWeek = new Date(startOfToday.getTime() + 7 * DAY_MS);

  const when = new Date(scheduledTime);
  if (when < startOfTomorrow) return 'today';
  if (when < startOfDayAfterTomorrow) return 'tomorrow';
  if (when < startOfNextWeek) return 'thisWeek';
  return 'later';
}

export default function Encounters() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  const { data: encounters, isLoading } = useQuery({
    queryKey: ['encounters'],
    queryFn: () => api.get<Encounter[]>('/api/encounters'),
  });

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading')} className="py-12" />;
  }

  const filtered = (encounters || []).filter((encounter) =>
    TAB_STATUSES[activeTab].includes(encounter.status),
  );

  // The upcoming tab is grouped by day so it reads as a schedule.
  const grouped = new Map<DayGroup, Encounter[]>();
  if (activeTab === 'upcoming') {
    for (const encounter of filtered) {
      const group = dayGroupOf(encounter.scheduled_time);
      const bucket = grouped.get(group);
      if (bucket) {
        bucket.push(encounter);
      } else {
        grouped.set(group, [encounter]);
      }
    }
  }

  const renderRow = (encounter: Encounter) => (
    <li key={encounter.id}>
      <Link to={`/encounters/${encounter.id}`} className="block hover:bg-bg-canvas transition-colors">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <p className="text-sm font-medium text-text-primary">
                {encounter.patient_name}
              </p>
            </div>
            <StatusPill
              status={encounterStatusToDesignSystem(encounter.status)}
              label={t(`encounters.statuses.${encounter.status}`)}
            />
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-text-secondary">
            {encounter.scheduled_time && (
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4" />
                <span>{new Date(encounter.scheduled_time).toLocaleString()}</span>
              </div>
            )}
            {encounter.assigned_to && (
              <div className="flex items-center gap-1.5">
                <UserIcon className="w-4 h-4" />
                <span>{encounter.assigned_to.substring(0, 8)}</span>
              </div>
            )}
            {encounter.phase && (
              <span>{t(`encounters.phases.${encounter.phase}`)}</span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-text-primary">{t('encounters.title')}</h1>
        <Link to="/encounters/new">
          <Button>{t('encounters.create')}</Button>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border-default mb-6">
        <nav className="-mb-px flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
              }`}
            >
              {t(`encounters.tabs.${tab}`)}
            </button>
          ))}
        </nav>
      </div>

      {filtered.length > 0 ? (
        activeTab === 'upcoming' ? (
          <div className="space-y-6">
            {DAY_GROUP_ORDER.filter((group) => grouped.has(group)).map((group) => (
              <div key={group}>
                <h2 className="text-sm font-medium text-text-secondary mb-2">
                  {t(`schedule.${group}`)}
                </h2>
                <Card padding="none">
                  <ul className="divide-y divide-border-default">
                    {grouped.get(group)!.map(renderRow)}
                  </ul>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card padding="none">
            <ul className="divide-y divide-border-default">
              {filtered.map(renderRow)}
            </ul>
          </Card>
        )
      ) : (
        <EmptyState
          icon={<ClipboardDocumentListIcon className="w-12 h-12" />}
          title={t('encounters.empty.title')}
          description={t('encounters.empty.description')}
          action={{
            label: t('encounters.create'),
            onClick: () => (window.location.href = '/encounters/new'),
          }}
        />
      )}
    </div>
  );
}
