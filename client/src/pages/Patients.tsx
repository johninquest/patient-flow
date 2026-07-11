import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, Avatar, StatusPill, EmptyState, LoadingSpinner, Button } from '../components/ui';
import { UserGroupIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}

export default function Patients() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<Patient[]>('/api/patients'),
  });

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading')} className="py-12" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-text-primary">{t('patients.title')}</h1>
        {(user?.role === 'clinical_staff' || user?.role === 'admin') && (
          <Link to="/patients/new">
            <Button>{t('patients.create')}</Button>
          </Link>
        )}
      </div>

      {patients && patients.length > 0 ? (
        <Card padding="none">
          <ul className="divide-y divide-border-default">
            {patients.map((patient) => {
              const initials = `${patient.firstName[0]}${patient.lastName[0]}`;
              return (
                <li key={patient.id}>
                  <Link to={`/patients/${patient.id}`} className="block hover:bg-bg-canvas transition-colors">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials} size="md" variant="neutral" />
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {patient.firstName} {patient.lastName}
                            </p>
                          </div>
                        </div>
                        <StatusPill status="ready" label={t('patients.status.active')} />
                      </div>
                      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-text-secondary">
                        {patient.email && (
                          <div className="flex items-center gap-1.5">
                            <EnvelopeIcon className="w-4 h-4" />
                            <span>{patient.email}</span>
                          </div>
                        )}
                        {patient.phone && (
                          <div className="flex items-center gap-1.5">
                            <PhoneIcon className="w-4 h-4" />
                            <span>{patient.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <EmptyState
          icon={<UserGroupIcon className="w-12 h-12" />}
          title={t('patients.empty.title')}
          description={t('patients.empty.description')}
          action={
            (user?.role === 'clinical_staff' || user?.role === 'admin')
              ? {
                  label: t('patients.create'),
                  onClick: () => window.location.href = '/patients/new',
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
