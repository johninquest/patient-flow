import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { MetricCard, LoadingSpinner } from '../components/ui';
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalPatients: number;
  activeEncounters: number;
  pendingTasks: number;
  todayEncounters: number;
}

export default function Dashboard() {
  const { t } = useTranslation();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/api/dashboard/stats'),
  });

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading')} className="py-12" />;
  }

  return (
    <div>
      <h1 className="text-2xl font-medium text-text-primary mb-6">{t('nav.dashboard')}</h1>
      
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label={t('patients.title')}
          value={stats?.totalPatients || 0}
          icon={<UserGroupIcon className="w-6 h-6" />}
          linkTo="/patients"
          linkLabel={t('common.viewAll')}
        />

        <MetricCard
          label={`Active ${t('encounters.title')}`}
          value={stats?.activeEncounters || 0}
          icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
          linkTo="/encounters"
          linkLabel={t('common.viewAll')}
        />

        <MetricCard
          label={`Pending ${t('tasks.title')}`}
          value={stats?.pendingTasks || 0}
          icon={<CheckCircleIcon className="w-6 h-6" />}
          linkTo="/tasks"
          linkLabel={t('common.viewAll')}
        />

        <MetricCard
          label={`Today's ${t('encounters.title')}`}
          value={stats?.todayEncounters || 0}
          icon={<CalendarIcon className="w-6 h-6" />}
          linkTo="/encounters"
          linkLabel={t('common.viewAll')}
        />
      </div>
    </div>
  );
}
