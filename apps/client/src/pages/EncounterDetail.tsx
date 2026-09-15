import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { useParams, Link } from 'react-router-dom';
import { Card, StatusPill, LoadingSpinner, Button, Modal, FormInput, FormSelect, EmptyState } from '../components/ui';
import { ArrowLeftIcon, PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { AuditTimeline } from '../components/AuditTimeline';
import {
  type Encounter,
  type EncounterPhase,
  type EncounterStatus,
  type Task,
  type TaskStatus,
  type TaskPriority,
  type AuditLog,
  type AssignableUser,
  ENCOUNTER_PHASES,
  encounterStatusToDesignSystem,
  taskPriorityToDesignSystem,
} from '../lib/types/flow.types';

type TabType = 'details' | 'tasks' | 'activity';

interface EncounterUpdatePayload {
  status?: EncounterStatus;
  phase?: EncounterPhase;
}

interface TaskPayload {
  encounter_id?: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_user_id?: string;
  blocking?: boolean;
  due_at?: string;
}

export default function EncounterDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('details');

  const { data: encounter, isLoading } = useQuery({
    queryKey: ['encounter', id],
    queryFn: () => api.get<Encounter>(`/api/encounters/${id}`),
  });

  const { data: tasks } = useQuery({
    queryKey: ['encounter-tasks', id],
    queryFn: () => api.get<Task[]>(`/api/tasks?encounter_id=${id}`),
    enabled: !!id,
  });

  const { data: staff } = useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: () => api.get<AssignableUser[]>('/api/users/assignable'),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['encounter-audit', id],
    queryFn: () => api.get<AuditLog[]>(`/api/audit/encounter/${id}`),
    enabled: !!id,
  });

  const invalidateEncounter = () => {
    queryClient.invalidateQueries({ queryKey: ['encounter', id] });
    queryClient.invalidateQueries({ queryKey: ['encounters'] });
    queryClient.invalidateQueries({ queryKey: ['encounter-audit', id] });
    queryClient.invalidateQueries({ queryKey: ['flow'] });
  };

  const updateMutation = useMutation({
    mutationFn: (data: EncounterUpdatePayload) =>
      api.put(`/api/encounters/${id}`, data),
    onSuccess: invalidateEncounter,
    onError: (err: Error) => {
      console.error('Failed to update encounter:', err.message);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: TaskPayload) => api.post('/api/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['flow'] });
      setShowTaskModal(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: TaskPayload }) =>
      api.put(`/api/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter-tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['flow'] });
    },
  });

  const handleStatusChange = (newStatus: EncounterStatus) => {
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

  /** Resolves an assignee ID to a display name, falling back to the id. */
  const assigneeName = (userId: string | null): string | null => {
    if (!userId) return null;
    const member = staff?.find((m) => m.id === userId);
    return member ? member.name || member.email : userId.substring(0, 8);
  };

  // Determine available status actions based on current status
  const getActions = () => {
    switch (encounter.status) {
      case 'scheduled':
        return [
          { label: t('encounters.checkIn'), status: 'checked_in' as const, variant: 'primary' as const },
          { label: t('encounters.noShow'), status: 'no_show' as const, variant: 'secondary' as const },
          { label: t('encounters.cancel'), status: 'cancelled' as const, variant: 'danger' as const },
        ];
      case 'checked_in':
        return [
          { label: t('encounters.start'), status: 'in_progress' as const, variant: 'primary' as const },
          { label: t('encounters.cancel'), status: 'cancelled' as const, variant: 'danger' as const },
        ];
      case 'in_progress':
        return [
          { label: t('encounters.complete'), status: 'completed' as const, variant: 'primary' as const },
          { label: t('encounters.cancel'), status: 'cancelled' as const, variant: 'danger' as const },
        ];
      default:
        return []; // Terminal states
    }
  };

  const actions = getActions();
  const isInProgress = encounter.status === 'in_progress';
  const openTasks = (tasks || []).filter((task) => task.status !== 'done');

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
          {(['details', 'tasks', 'activity'] as TabType[]).map((tab) => (
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
              {tab === 'tasks' && openTasks.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs bg-status-waiting-bg text-status-waiting-text">
                  {openTasks.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'details' && (
        <div className="space-y-6">
          <Card padding="none">
            <div className="px-4 py-5 sm:px-6 border-b border-border-default">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-text-primary">
                  {encounter.patient_name}
                </h3>
                <StatusPill
                  status={encounterStatusToDesignSystem(encounter.status)}
                  label={t(`encounters.statuses.${encounter.status}`)}
                />
              </div>
            </div>
            <div>
              <dl>
                {encounter.scheduled_time && (
                  <div className="bg-bg-canvas px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-text-secondary">{t('encounters.scheduledTime')}</dt>
                    <dd className="mt-1 text-sm text-text-primary sm:mt-0 sm:col-span-2">
                      {new Date(encounter.scheduled_time).toLocaleString()}
                    </dd>
                  </div>
                )}
                {encounter.assigned_to && (
                  <div className="bg-bg-surface px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-text-secondary">{t('encounters.assignedTo')}</dt>
                    <dd className="mt-1 text-sm text-text-primary sm:mt-0 sm:col-span-2">
                      {assigneeName(encounter.assigned_to)}
                    </dd>
                  </div>
                )}
                {encounter.phase && (
                  <div className="bg-bg-canvas px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-text-secondary">{t('encounters.phase')}</dt>
                    <dd className="mt-1 text-sm text-text-primary sm:mt-0 sm:col-span-2">
                      {t(`encounters.phases.${encounter.phase}`)}
                    </dd>
                  </div>
                )}
                {encounter.notes && (
                  <div className="bg-bg-surface px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-text-secondary">{t('encounters.notes')}</dt>
                    <dd className="mt-1 text-sm text-text-primary sm:mt-0 sm:col-span-2">{encounter.notes}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Status Action Buttons */}
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
                        ? t('common.updating')
                        : action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Phase controls — only meaningful while the encounter is in progress */}
          {isInProgress && (
            <Card>
              <h3 className="text-lg font-medium text-text-primary mb-1">
                {t('encounters.phaseActions.title')}
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                {t('encounters.phaseActions.description')}
              </p>
              <div className="flex flex-wrap gap-3">
                {ENCOUNTER_PHASES.map((phase) => (
                  <Button
                    key={phase}
                    variant={encounter.phase === phase ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => updateMutation.mutate({ phase })}
                    disabled={updateMutation.isPending || encounter.phase === phase}
                  >
                    {t(`encounters.phases.${phase}`)}
                  </Button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-text-primary">
              {t('tasks.title')}
            </h3>
            <Button size="sm" onClick={() => setShowTaskModal(true)}>
              <PlusIcon className="w-4 h-4 mr-1.5" />
              {t('tasks.create')}
            </Button>
          </div>

          {tasks && tasks.length > 0 ? (
            <Card padding="none">
              <ul className="divide-y divide-border-default">
                {tasks.map((task) => (
                  <li key={task.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-text-primary">{task.title}</p>
                          <StatusPill
                            status={taskPriorityToDesignSystem(task.priority)}
                            label={t(`tasks.priorities.${task.priority}`)}
                          />
                          {task.blocking && (
                            <StatusPill status="delayed" label={t('tasks.blocking')} />
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-text-secondary mb-1">{task.description}</p>
                        )}
                        {assigneeName(task.assigned_user_id) && (
                          <p className="text-xs text-text-secondary">
                            {t('tasks.assignedTo')}: {assigneeName(task.assigned_user_id)}
                          </p>
                        )}
                      </div>
                      <select
                        value={task.status}
                        aria-label={t('tasks.status')}
                        onChange={(e) =>
                          updateTaskMutation.mutate({
                            taskId: task.id,
                            data: { status: e.target.value as TaskStatus },
                          })
                        }
                        className="text-sm border border-border-default rounded-[var(--radius-control)] px-2 py-1 bg-bg-surface text-text-primary"
                      >
                        <option value="todo">{t('tasks.statuses.todo')}</option>
                        <option value="in_progress">{t('tasks.statuses.in_progress')}</option>
                        <option value="done">{t('tasks.statuses.done')}</option>
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <EmptyState
              icon={<CheckCircleIcon className="w-12 h-12" />}
              title={t('tasks.empty.title')}
              description={t('tasks.empty.description')}
            />
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <AuditTimeline logs={auditLogs || []} title={t('encounters.activity')} />
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title={t('encounters.confirmCancel.title')}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {t('encounters.confirmCancel.message')}
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
              {t('common.no')}
            </Button>
            <Button variant="danger" onClick={confirmCancel} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t('common.cancelling') : t('common.yes')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Task Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={t('tasks.create')}
      >
        <EncounterTaskForm
          encounterId={encounter.id}
          staff={staff || []}
          isLoading={createTaskMutation.isPending}
          onCancel={() => setShowTaskModal(false)}
          onSubmit={(data) => createTaskMutation.mutate(data)}
        />
      </Modal>
    </div>
  );
}

interface EncounterTaskFormProps {
  encounterId: string;
  staff: AssignableUser[];
  isLoading: boolean;
  onCancel: () => void;
  onSubmit: (data: TaskPayload) => void;
}

/**
 * Task creation form scoped to a single encounter — the encounter is implied,
 * so the user never has to pick one.
 */
function EncounterTaskForm({
  encounterId,
  staff,
  isLoading,
  onCancel,
  onSubmit,
}: EncounterTaskFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [blocking, setBlocking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: TaskPayload = {
      encounter_id: encounterId,
      title,
      priority,
      blocking,
    };
    if (description.trim()) payload.description = description.trim();
    if (assignedUserId) payload.assigned_user_id = assignedUserId;

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        label={t('tasks.title_field')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <div>
        <label
          htmlFor="encounter-task-description"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          {t('tasks.description')}
        </label>
        <textarea
          id="encounter-task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-border-default rounded-[var(--radius-control)] bg-bg-surface text-text-primary"
        />
      </div>

      <FormSelect
        label={t('tasks.priority')}
        value={priority}
        options={[
          { value: 'low', label: t('tasks.priorities.low') },
          { value: 'medium', label: t('tasks.priorities.medium') },
          { value: 'high', label: t('tasks.priorities.high') },
        ]}
        onChange={(e) => setPriority(e.target.value as TaskPriority)}
      />

      <FormSelect
        label={t('tasks.assignedTo')}
        value={assignedUserId}
        placeholder={t('tasks.unassigned')}
        options={staff.map((member) => ({
          value: member.id,
          label: `${member.name || member.email} (${t(`staff.roles.${member.role}`, member.role)})`,
        }))}
        onChange={(e) => setAssignedUserId(e.target.value)}
      />

      <div className="flex items-center gap-2">
        <input
          id="encounter-task-blocking"
          type="checkbox"
          checked={blocking}
          onChange={(e) => setBlocking(e.target.checked)}
          className="h-4 w-4 rounded border-border-default text-primary focus:ring-primary/50"
        />
        <label htmlFor="encounter-task-blocking" className="text-sm text-text-primary">
          {t('tasks.blocking')}
        </label>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="secondary" type="button" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </form>
  );
}
