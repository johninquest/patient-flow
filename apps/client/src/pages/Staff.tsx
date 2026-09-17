import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, FormInput, FormSelect, Modal, StatusPill, LoadingSpinner } from '../components/ui';
import { ExclamationTriangleIcon, ClockIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { AuditTimeline } from '../components/AuditTimeline';
import { ApiError } from '../lib/api/errors';
import type { AuditLog } from '../lib/types/flow.types';

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

const ROLES = ['admin', 'provider', 'clinical_staff', 'front_desk'] as const;

/**
 * Roles an admin can assign from the staff table.
 *
 * Includes `pending` so access can be revoked without suspending the account —
 * the user stays signed in and lands on the waiting room instead of being
 * locked out. The "New Staff" modal deliberately uses `ROLES` only: creating a
 * user who cannot do anything is never the intent there.
 */
const ASSIGNABLE_ROLES = [...ROLES, 'pending'] as const;

const TITLES = [
  'Doctor',
  'Nurse',
  'Medical Physicist',
  'Lab Technician',
  'Pharmacist',
  'Receptionist',
  'Administrator',
] as const;

/**
 * Professional titles are stored as their English display string, so these keys
 * map that stored value to a translation. Deliberately not a data migration:
 * changing the stored vocabulary would invalidate every existing `user.title`.
 * An unrecognised value (legacy free text) renders verbatim, matching how
 * `PatientDetail` treats unknown emergency-contact relations.
 */
const TITLE_LABEL_KEYS: Record<string, string> = {
  Doctor: 'staff.titles.doctor',
  Nurse: 'staff.titles.nurse',
  'Medical Physicist': 'staff.titles.medicalPhysicist',
  'Lab Technician': 'staff.titles.labTechnician',
  Pharmacist: 'staff.titles.pharmacist',
  Receptionist: 'staff.titles.receptionist',
  Administrator: 'staff.titles.administrator',
};

/** Minimum password length, mirrored by `createUserSchema` on the API. */
const MIN_PASSWORD_LENGTH = 8;

interface CreateStaffForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  title: string;
}

const EMPTY_CREATE_FORM: CreateStaffForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: ROLES[0],
  title: '',
};

export default function Staff() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('list');

  // The create form is fully controlled so the confirmation field can be
  // validated as the user types. Its errors live in their own state and are
  // rendered *inside* the modal: the page-level `error` banner sits in the page
  // body behind the overlay, so reporting a mismatch there made the submit
  // button look like a no-op.
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createForm, setCreateForm] = useState<CreateStaffForm>(EMPTY_CREATE_FORM);

  /**
   * Real-time mismatch. Only fires once the user has typed something in the
   * confirmation field, so the form does not open already showing an error.
   */
  const passwordsMismatch =
    createForm.confirmPassword.length > 0 &&
    createForm.password !== createForm.confirmPassword;

  const passwordTooShort =
    createForm.password.length > 0 &&
    createForm.password.length < MIN_PASSWORD_LENGTH;

  const resetCreateForm = () => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError(null);
    setShowCreatePassword(false);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetCreateForm();
  };

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<StaffMember[]>('/api/users'),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['staff-audit'],
    queryFn: () => api.get<AuditLog[]>('/api/audit/users'),
    enabled: activeTab === 'activity',
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: string; title?: string } }) =>
      api.patch<StaffMember>(`/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-audit'] });
      setError(null);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message);
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: string; title?: string }) =>
      api.post<StaffMember>('/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-audit'] });
      closeCreateModal();
    },
    onError: (err: Error) => {
      setCreateError(err.message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<StaffMember>(`/api/users/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-audit'] });
      setShowSuspendConfirm(null);
      setError(null);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message);
      }
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

    // The submit button is disabled in both cases; this guard covers a submit
    // triggered by pressing Enter in a field.
    if (passwordsMismatch || passwordTooShort) return;

    createMutation.mutate({
      name: createForm.name,
      email: createForm.email,
      password: createForm.password,
      role: createForm.role,
      title: createForm.title || undefined,
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
              {t(`staff.tabs.${tab}`)}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'list' && (
        <>

      {/* Create Staff Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={closeCreateModal}
        title={t('staff.createStaff')}
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          {createError && (
            <div
              role="alert"
              className="rounded-[var(--radius-control)] bg-status-delayed-bg border border-status-delayed-text/20 p-3"
            >
              <p className="text-sm text-status-delayed-text">{createError}</p>
            </div>
          )}

          <FormInput
            label={t('staff.name')}
            name="name"
            type="text"
            required
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <FormInput
            label={t('staff.email')}
            name="email"
            type="email"
            required
            value={createForm.email}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, email: e.target.value }))
            }
          />

          {/* Both password fields share one toggle: revealing only one of a pair
              you are trying to compare is not useful. */}
          <div className="relative">
            <FormInput
              label={t('staff.password')}
              name="password"
              type={showCreatePassword ? 'text' : 'password'}
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={createForm.password}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, password: e.target.value }))
              }
              error={
                passwordTooShort
                  ? t('staff.passwordTooShort', { min: MIN_PASSWORD_LENGTH })
                  : undefined
              }
              helpText={t('staff.passwordMinLength', {
                min: MIN_PASSWORD_LENGTH,
              })}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCreatePassword((prev) => !prev)}
              aria-label={
                showCreatePassword
                  ? t('auth.hidePassword')
                  : t('auth.showPassword')
              }
              className="absolute right-3 top-9.5 text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-(--radius-control) p-0.5"
            >
              {showCreatePassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          <FormInput
            label={t('staff.confirmPassword')}
            name="confirmPassword"
            type={showCreatePassword ? 'text' : 'password'}
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={createForm.confirmPassword}
            onChange={(e) =>
              setCreateForm((prev) => ({
                ...prev,
                confirmPassword: e.target.value,
              }))
            }
            error={passwordsMismatch ? t('staff.passwordMismatch') : undefined}
          />

          <FormSelect
            label={t('staff.role')}
            name="role"
            required
            value={createForm.role}
            options={ROLES.map((role) => ({
              value: role,
              label: t(`staff.roles.${role}`),
            }))}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, role: e.target.value }))
            }
          />

          <FormSelect
            label={t('staff.title_field')}
            name="title"
            value={createForm.title}
            placeholder={t('staff.noTitle')}
            options={TITLES.map((title) => ({
              value: title,
              label: t(TITLE_LABEL_KEYS[title], title),
            }))}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, title: e.target.value }))
            }
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={closeCreateModal}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending || passwordsMismatch || passwordTooShort
              }
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
                const isPending = member.role === 'pending';
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
                        {ASSIGNABLE_ROLES.map((role) => (
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
                            {t(TITLE_LABEL_KEYS[title], title)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isPending ? (
                        <StatusPill
                          status="waiting"
                          label={t('staff.pendingAccess')}
                          icon={<ClockIcon className="w-4 h-4" />}
                        />
                      ) : (
                        <StatusPill
                          status={isSuspended ? 'delayed' : 'ready'}
                          label={isSuspended ? t('staff.suspended') : t('staff.active')}
                        />
                      )}
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
        <AuditTimeline logs={auditLogs || []} title={t('staff.activity')} />
      )}
    </div>
  );
}
