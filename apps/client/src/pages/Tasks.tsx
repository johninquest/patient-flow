import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { Card, StatusPill, EmptyState, LoadingSpinner, Button, Modal, FormInput, FormSelect } from '../components/ui';
import { CheckCircleIcon, UserIcon, CalendarIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ApiError } from '../lib/api/errors';
import {
  type Task,
  type TaskStatus,
  type TaskPriority,
  type Encounter,
  type AssignableUser,
  taskStatusToDesignSystem,
  taskPriorityToDesignSystem,
} from '../lib/types/flow.types';

/** Shape of the create/update payload sent to the API. */
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

export default function Tasks() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/api/tasks'),
  });

  const { data: encounters } = useQuery({
    queryKey: ['encounters'],
    queryFn: () => api.get<Encounter[]>('/api/encounters'),
  });

  // Any authenticated user may read the assignable list (unlike /api/users).
  const { data: staff } = useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: () => api.get<AssignableUser[]>('/api/users/assignable'),
  });

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['flow'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: TaskPayload) => api.post('/api/tasks', data),
    onSuccess: () => {
      invalidateTasks();
      setShowCreateModal(false);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.message : err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskPayload }) =>
      api.put(`/api/tasks/${id}`, data),
    onSuccess: () => {
      invalidateTasks();
      setEditingTask(null);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.message : err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/tasks/${id}`),
    onSuccess: () => {
      invalidateTasks();
      setError(null);
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.message : err.message);
    },
  });

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateMutation.mutate({ id: taskId, data: { status: newStatus } });
  };

  /** Resolves an assignee ID to a display name, falling back to the id. */
  const assigneeName = (userId: string | null): string | null => {
    if (!userId) return null;
    const member = staff?.find((m) => m.id === userId);
    return member ? member.name || member.email : userId.substring(0, 8);
  };

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading')} className="py-12" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-text-primary">{t('tasks.title')}</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="w-4 h-4 mr-1.5" />
          {t('tasks.create')}
        </Button>
      </div>

      {error && (
        <Card className="mb-4 bg-status-delayed-bg border-status-delayed-text/20">
          <p className="text-sm text-status-delayed-text">{error}</p>
        </Card>
      )}

      {tasks && tasks.length > 0 ? (
        <Card padding="none">
          <ul className="divide-y divide-border-default">
            {tasks.map((task) => (
              <li key={task.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-medium text-text-primary">
                          {task.title}
                        </p>
                        <StatusPill
                          status={taskPriorityToDesignSystem(task.priority)}
                          label={t(`tasks.priorities.${task.priority}`)}
                        />
                        <StatusPill
                          status={taskStatusToDesignSystem(task.status)}
                          label={t(`tasks.statuses.${task.status}`)}
                        />
                        {task.blocking && (
                          <StatusPill
                            status="delayed"
                            label={t('tasks.blocking')}
                          />
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-text-secondary mb-2">{task.description}</p>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-4 h-4" />
                          <span>{task.patient_name}</span>
                        </div>
                        {assigneeName(task.assigned_user_id) && (
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="w-4 h-4" />
                            <span>{assigneeName(task.assigned_user_id)}</span>
                          </div>
                        )}
                        {task.due_at && (
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{new Date(task.due_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={task.status}
                        aria-label={t('tasks.status')}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                        className="text-sm border border-border-default rounded-[var(--radius-control)] px-2 py-1 bg-bg-surface text-text-primary"
                      >
                        <option value="todo">{t('tasks.statuses.todo')}</option>
                        <option value="in_progress">{t('tasks.statuses.in_progress')}</option>
                        <option value="done">{t('tasks.statuses.done')}</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={t('tasks.edit')}
                        onClick={() => setEditingTask(task)}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={t('common.delete')}
                        onClick={() => {
                          if (confirm(t('tasks.confirmDelete'))) {
                            deleteMutation.mutate(task.id);
                          }
                        }}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
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

      {/* Create Task Modal */}
      <TaskFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        encounters={encounters || []}
        staff={staff || []}
        isLoading={createMutation.isPending}
        title={t('tasks.create')}
      />

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskFormModal
          isOpen={true}
          onClose={() => setEditingTask(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingTask.id, data })}
          encounters={encounters || []}
          staff={staff || []}
          isLoading={updateMutation.isPending}
          title={t('tasks.edit')}
          initialData={editingTask}
          // An existing task keeps its encounter; only the backend owns that link.
          lockEncounter
        />
      )}
    </div>
  );
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskPayload) => void;
  encounters: Encounter[];
  staff: AssignableUser[];
  isLoading: boolean;
  title: string;
  initialData?: Task;
  /** When true, the encounter cannot be changed (editing an existing task). */
  lockEncounter?: boolean;
}

function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  encounters,
  staff,
  isLoading,
  title,
  initialData,
  lockEncounter = false,
}: TaskFormModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    encounter_id: initialData?.encounter_id || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || ('todo' as TaskStatus),
    priority: initialData?.priority || ('medium' as TaskPriority),
    assigned_user_id: initialData?.assigned_user_id || '',
    blocking: initialData?.blocking || false,
    due_at: initialData?.due_at ? initialData.due_at.slice(0, 16) : '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build the payload from explicit fields only — `undefined` values are
    // dropped rather than sent, because the API schema is strict.
    const payload: TaskPayload = {
      title: formData.title,
      status: formData.status,
      priority: formData.priority,
      blocking: formData.blocking,
    };

    if (!lockEncounter) {
      payload.encounter_id = formData.encounter_id;
    }
    if (formData.description.trim()) {
      payload.description = formData.description.trim();
    }
    if (formData.assigned_user_id) {
      payload.assigned_user_id = formData.assigned_user_id;
    }
    if (formData.due_at) {
      payload.due_at = new Date(formData.due_at).toISOString();
    }

    onSubmit(payload);
  };

  const staffOptions = staff.map((member) => ({
    value: member.id,
    label: `${member.name || member.email} (${t(`staff.roles.${member.role}`, member.role)})`,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!lockEncounter && (
          <FormSelect
            label={t('tasks.encounter')}
            value={formData.encounter_id}
            placeholder={t('tasks.selectEncounter')}
            options={
              encounters.map((enc) => ({
                value: enc.id,
                label: `${enc.patient_name} — ${t(`encounters.statuses.${enc.status}`)}`,
              }))
            }
            onChange={(e) =>
              setFormData({ ...formData, encounter_id: e.target.value })
            }
            required
          />
        )}

        <FormInput
          label={t('tasks.title_field')}
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />

        <div>
          <label
            htmlFor="task-description"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            {t('tasks.description')}
          </label>
          <textarea
            id="task-description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 border border-border-default rounded-[var(--radius-control)] bg-bg-surface text-text-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label={t('tasks.status')}
            value={formData.status}
            options={[
              { value: 'todo', label: t('tasks.statuses.todo') },
              { value: 'in_progress', label: t('tasks.statuses.in_progress') },
              { value: 'done', label: t('tasks.statuses.done') },
            ]}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value as TaskStatus })
            }
          />

          <FormSelect
            label={t('tasks.priority')}
            value={formData.priority}
            options={[
              { value: 'low', label: t('tasks.priorities.low') },
              { value: 'medium', label: t('tasks.priorities.medium') },
              { value: 'high', label: t('tasks.priorities.high') },
            ]}
            onChange={(e) =>
              setFormData({
                ...formData,
                priority: e.target.value as TaskPriority,
              })
            }
          />
        </div>

        <FormSelect
          label={t('tasks.assignedTo')}
          value={formData.assigned_user_id}
          placeholder={t('tasks.unassigned')}
          options={staffOptions}
          onChange={(e) =>
            setFormData({ ...formData, assigned_user_id: e.target.value })
          }
        />

        <div className="flex items-center gap-2">
          <input
            id="task-blocking"
            type="checkbox"
            checked={formData.blocking}
            onChange={(e) =>
              setFormData({ ...formData, blocking: e.target.checked })
            }
            className="h-4 w-4 rounded border-border-default text-primary focus:ring-primary/50"
          />
          <label
            htmlFor="task-blocking"
            className="text-sm text-text-primary"
          >
            {t('tasks.blocking')}
          </label>
        </div>

        <FormInput
          label={t('tasks.dueDate')}
          type="datetime-local"
          value={formData.due_at}
          onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
        />

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="secondary" onClick={onClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
