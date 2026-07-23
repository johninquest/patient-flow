import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { useParams, Link } from 'react-router-dom';
import { Card, StatusPill, LoadingSpinner, Button, Modal } from '../components/ui';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { AuditTimeline } from '../components/AuditTimeline';

type TabType = 'details' | 'activity';

interface Encounter {
  id: string;
  patientId: string;
  patientName: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled';
  scheduledTime?: string;
  assignedTo?: string;
  notes?: string;
}

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

export default function EncounterDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('details');

  const { data: encounter, isLoading } = useQuery({
    queryKey: ['encounter', id],
    queryFn: () => api.get<Encounter>(`/api/encounters/${id}`),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['encounter-audit', id],
    queryFn: () => api.get<AuditLog[]>(`/api/audit/encounter/${id}`),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { status: string }) =>
      api.put(`/api/encounters/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter', id] });
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
    },
    onError: (err: Error) => {
      console.error('Failed to update encounter:', err.message);
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'cancelled') {
      setShowCancelModal(true);
    } else {
      updateMutation.mutate({ status: newStatus });
    }
  };

  const confirmCancel = () => {
    updateMutation.mutate({ status: 'cancelled' });
    setShowCancelModal(false);
  };

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading')} className="py-12" />;
  }

  if (!encounter) {
    return <div className="text-center py-12 text-text-secondary">{t('encounters.notFound')}</div>;
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

  // Determine available actions based on current status
  const getActions = () => {
    switch (encounter.status) {
      case 'scheduled':
        return [
          { label: t('encounters.checkIn', 'Check In'), status: 'checked_in', variant: 'primary' as const },
          { label: t('encounters.cancel', 'Cancel'), status: 'cancelled', variant: 'danger' as const },
        ];
      case 'checked_in':
        return [
          { label: t('encounters.start', 'Start'), status: 'in_progress', variant: 'primary' as const },
          { label: t('encounters.cancel', 'Cancel'), status: 'cancelled', variant: 'danger' as const },
        ];
      case 'in_progress':
        return [
          { label: t('encounters.complete', 'Complete'), status: 'completed', variant: 'primary' as const },
          { label: t('encounters.cancel', 'Cancel'), status: 'cancelled', variant: 'danger' as const },
        ];
      case 'completed':
      case 'cancelled':
        return []; // Terminal states
      default:
        return [];
    }
  };

  const actions = getActions();

  return (
    <div>
      <div className="mb-6">
        <Link to="/encounters" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80">
          <ArrowLeftIcon className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
      </div>
{/* Tab Navigation */}
      <div className="border-b border-border-default mb-6">
        <nav className="-mb-px flex space-x-8">
          {(['details', 'activity'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
              }`}
            >
              {t(`encounters.tabs.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'details' && (
        <Card padding="none">
          <div className="px-4 py-5 sm:px-6 border-b border-border-default">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-text-primary">
                {encounter.patientName}
              </h3>
              <StatusPill
                status={mapStatusToDesignSystem(encounter.status)}
                label={t(`encounters.statuses.${encounter.status}`)}
              />
            </div>
          </div>
          <div>
            <dl>
              {encounter.scheduledTime && (
                <div className="bg-bg-canvas px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-text-secondary">{t('encounters.scheduledTime')}</dt>
                  <dd className="mt-1 text-sm text-text-primary sm:mt-0 sm:col-span-2">
                    {new Date(encounter.scheduledTime).toLocaleString()}
                  </dd>
                </div>
              )}
              {encounter.assignedTo && (
                <div className="bg-bg-surface px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-text-secondary">{t('encounters.assignedTo')}</dt>
                  <dd className="mt-1 text-sm text-text-primary sm:mt-0 sm:col-span-2">{encounter.assignedTo}</dd>
                </div>
              )}
              {encounter.notes && (
                <div className="bg-bg-canvas px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-text-secondary">{t('encounters.notes')}</dt>
                  <dd className="mt-1 text-sm text-text-primary sm:mt-0 sm:col-span-2">{encounter.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Action Buttons */}
          {actions.length > 0 && (
            <div className="px-4 py-5 sm:px-6 border-t border-border-default bg-bg-canvas">
              <div className="flex flex-wrap gap-3">
                {actions.map((action) => (
                  <Button
                    key={action.status}
                    variant={action.variant}
                    onClick={() => handleStatusChange(action.status)}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending && updateMutation.variables?.status === action.status
                      ? t('common.updating', 'Updating...')
                      : action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'activity' && (
        <AuditTimeline logs={auditLogs || []} title={t('encounters.activity', 'Activity History')} />
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title={t('encounters.confirmCancel.title', 'Cancel Encounter')}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {t('encounters.confirmCancel.message', 'Are you sure you want to cancel this encounter? This action cannot be undone.')}
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowCancelModal(false)}
            >
              {t('common.no', 'No')}
            </Button>
            <Button
              variant="danger"
              onClick={confirmCancel}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending
                ? t('common.cancelling', 'Cancelling...')
                : t('common.yes', 'Yes, Cancel')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
