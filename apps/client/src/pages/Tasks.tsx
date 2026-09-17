import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { Card, StatusPill, EmptyState, LoadingSpinner, Button } from '../components/ui';
import { CheckCircleIcon, UserIcon, CalendarIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ApiError } from '../lib/api/errors';
import { TaskFormModal, type TaskPayload } from '../components/TaskFormModal';
import {
  type Task,
  type TaskStatus,
  type Encounter,
  type AssignableUser,
  taskStatusToDesignSystem,
  taskPriorityToDesignSystem,
} from '../lib/types/flow.types';

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
