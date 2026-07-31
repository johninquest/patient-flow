import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { Link } from 'react-router-dom';
import { Card, StatusPill, EmptyState, LoadingSpinner, Button } from '../components/ui';
import { ClipboardDocumentListIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';

interface Encounter {
  id: string;
  patientId: string;
  patientName: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled';
  scheduledTime?: string;
  assignedTo?: string;
}

export default function Encounters() {
  const { t } = useTranslation();

  const { data: encounters, isLoading } = useQuery({
    queryKey: ['encounters'],
    queryFn: () => api.get<Encounter[]>('/api/encounters'),
  });

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading')} className="py-12" />;
  }

  const mapStatusToDesignSystem = (status: string): 'waiting' | 'in_progress' | 'ready' | 'delayed' => {
    switch (status) {
      case 'scheduled':
      case 'checked_in':
        return 'waiting';
      case 'in_progress':
        return 'in_progress';
      case 'completed':
        return 'ready';
      case 'cancelled':
        return 'delayed';
      default:
        return 'waiting';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-text-primary">{t('encounters.title')}</h1>
        <Link to="/encounters/new">
          <Button>{t('encounters.create')}</Button>
        </Link>
      </div>

      {encounters && encounters.length > 0 ? (
        <Card padding="none">
          <ul className="divide-y divide-border-default">
            {encounters.map((encounter) => (
              <li key={encounter.id}>
                <Link to={`/encounters/${encounter.id}`} className="block hover:bg-bg-canvas transition-colors">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-text-primary">
                          {encounter.patientName}
                        </p>
                      </div>
                      <StatusPill
                        status={mapStatusToDesignSystem(encounter.status)}
                        label={t(`encounters.statuses.${encounter.status}`)}
                      />
                    </div>
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-text-secondary">
                      {encounter.scheduledTime && (
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4" />
                          <span>{new Date(encounter.scheduledTime).toLocaleString()}</span>
                        </div>
                      )}
                      {encounter.assignedTo && (
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-4 h-4" />
                          <span>{encounter.assignedTo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState
          icon={<ClipboardDocumentListIcon className="w-12 h-12" />}
          title={t('encounters.empty.title')}
          description={t('encounters.empty.description')}
          action={{
            label: t('encounters.create'),
            onClick: () => window.location.href = '/encounters/new',
          }}
        />
      )}
    </div>
  );
}
