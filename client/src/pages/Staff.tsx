import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, FormInput, Modal, StatusPill, LoadingSpinner } from '../components/ui';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { AuditTimeline } from '../components/AuditTimeline';

type TabType = 'list' | 'activity';

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  title: string | null;
  status: string;
  createdAt: string;
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

const ROLES = ['admin', 'provider', 'clinical_staff', 'front_desk'] as const;

const TITLES = [
  'Doctor',
  'Nurse',
  'Medical Physicist',
  'Lab Technician',
  'Pharmacist',
  'Receptionist',
  'Administrator',
] as const;

export default function Staff() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('list');

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<StaffMember[]>('/api/users'),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['staff-audit'],
    queryFn: () => api.get<AuditLog[]>('/api/audit/resource/user'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: string; title?: string } }) =>
      api.patch<StaffMember>(`/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: string; title?: string }) =>
      api.post<StaffMember>('/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setShowCreateModal(false);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<StaffMember>(`/api/users/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setShowSuspendConfirm(null);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateMutation.mutate({ id: userId, data: { role: newRole } });
  };

  const handleTitleChange = (userId: string, newTitle: string) => {
    updateMutation.mutate({ id: userId, data: { title: newTitle || undefined } });
  };

  const handleCreateStaff = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const role = formData.get('role') as string;
    const title = formData.get('title') as string;

    if (password !== confirmPassword) {
      setError(t('staff.passwordMismatch'));
      return;
    }

    createMutation.mutate({
      name,
      email,
      password,
      role,
      title: title || undefined,
    });
  };

  const handleStatusChange = (userId: string, newStatus: string) => {
    if (newStatus === 'suspended') {
      setShowSuspendConfirm(userId);
    } else {
      statusMutation.mutate({ id: userId, status: newStatus });
    }
  };

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading')} className="py-12" />;
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">{t('staff.title')}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t('staff.description')}</p>
        </div>
        {activeTab === 'list' && (
          <Button onClick={() => setShowCreateModal(true)}>
            {t('staff.createStaff')}
          </Button>
        )}
      </div>

      {error && (
        <Card className="mb-4 bg-status-delayed-bg border-status-delayed-text/20">
          <p className="text-sm text-status-delayed-text">{error}</p>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-border-default mb-6">
        <nav className="-mb-px flex space-x-8">
          {(['list', 'activity'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
              }`}
            >
              {t(`staff.tabs.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'list' && (
        <>

      {/* Create Staff Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('staff.createStaff')}
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <FormInput
            label={t('staff.name')}
            name="name"
            type="text"
            required
          />
          <FormInput
            label={t('staff.email')}
            name="email"
            type="email"
            required
          />
          <FormInput
            label={t('staff.password')}
            name="password"
            type="password"
            required
            minLength={8}
          />
          <FormInput
            label={t('staff.confirmPassword')}
            name="confirmPassword"
            type="password"
            required
            minLength={8}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('staff.role')}
            </label>
            <select
              name="role"
              required
              className="w-full px-3 py-2 border border-border-default rounded-[var(--radius-control)] bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`staff.roles.${role}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('staff.title_field')}</label>
                    <select
                      name="title"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                      <option value="">{t('staff.noTitle')}</option>
                      {TITLES.map((title) => (
                        <option key={title} value={title}>
                          {title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowCreateModal(false)}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      loading={createMutation.isPending}
                    >
                      {t('common.create')}
                    </Button>
                  </div>
                </form>
              </Modal>

      {/* Suspend Confirmation Modal */}
      <Modal
        isOpen={!!showSuspendConfirm}
        onClose={() => setShowSuspendConfirm(null)}
        title={t('staff.confirmSuspend')}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-status-delayed-text flex-shrink-0" />
            <p className="text-sm text-text-secondary">{t('staff.suspendWarning')}</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowSuspendConfirm(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (showSuspendConfirm) {
                  statusMutation.mutate({ id: showSuspendConfirm, status: 'suspended' });
                }
              }}
              loading={statusMutation.isPending}
            >
              {t('staff.suspend')}
            </Button>
          </div>
        </div>
      </Modal>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-default">
            <thead className="bg-bg-canvas">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('staff.name')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('staff.email')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('staff.role')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('staff.title_field')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('staff.status')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('staff.joined')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-bg-surface divide-y divide-border-default">
              {staff?.map((member) => {
                const isSelf = member.id === currentUser?.id;
                const isSuspended = member.status === 'suspended';
                return (
                  <tr key={member.id} className={`${isSelf ? 'bg-status-progress-bg/30' : ''} ${isSuspended ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className={`text-sm font-medium ${isSuspended ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                            {member.name || '—'}
                            {isSelf && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-status-progress-bg text-status-progress-text">
                                {t('staff.you')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-primary">{member.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        disabled={isSelf && member.role === 'admin'}
                        className="text-sm border border-border-default rounded-[var(--radius-control)] px-2 py-1 bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isSelf && member.role === 'admin' ? t('staff.cannotDemoteSelf') : undefined}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {t(`staff.roles.${role}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={member.title || ''}
                        onChange={(e) => handleTitleChange(member.id, e.target.value)}
                        disabled={isSuspended}
                        className="text-sm border border-border-default rounded-[var(--radius-control)] px-2 py-1 bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50"
                      >
                        <option value="">{t('staff.noTitle')}</option>
                        {TITLES.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusPill
                        status={isSuspended ? 'delayed' : 'ready'}
                        label={isSuspended ? t('staff.suspended') : t('staff.active')}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!isSelf && (
                        <Button
                          variant={isSuspended ? 'secondary' : 'danger'}
                          size="sm"
                          onClick={() => handleStatusChange(member.id, isSuspended ? 'active' : 'suspended')}
                          disabled={statusMutation.isPending}
                          loading={statusMutation.isPending}
                        >
                          {isSuspended ? t('staff.activate') : t('staff.suspend')}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
        </>
      )}

      {activeTab === 'activity' && (
        <AuditTimeline logs={auditLogs || []} title={t('staff.activity', 'Staff Activity History')} />
      )}
    </div>
  );
}
