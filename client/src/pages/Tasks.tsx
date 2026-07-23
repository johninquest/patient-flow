import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { Card, StatusPill, EmptyState, LoadingSpinner, Button, Modal, FormInput } from '../components/ui';
import { CheckCircleIcon, UserIcon, CalendarIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  dueDate?: string;
  encounterId: string;
  patientName: string;
}

interface Encounter {
  id: string;
  patient_id: string;
  status: string;
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

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => api.post('/api/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreateModal(false);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      api.put(`/api/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTask(null);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleStatusChange = (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    updateMutation.mutate({ id: taskId, data: { status: newStatus } });
  };

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading')} className="py-12" />;
  }

  const mapPriorityToDesignSystem = (priority: string): 'waiting' | 'in_progress' | 'ready' | 'delayed' => {
    switch (priority) {
      case 'high':
        return 'delayed';
      case 'medium':
        return 'waiting';
      case 'low':
        return 'ready';
      default:
        return 'waiting';
    }
  };

  const mapStatusToDesignSystem = (status: string): 'waiting' | 'in_progress' | 'ready' | 'delayed' => {
    switch (status) {
      case 'todo':
        return 'waiting';
      case 'in_progress':
        return 'in_progress';
      case 'done':
        return 'ready';
      default:
        return 'waiting';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-text-primary">{t('tasks.title')}</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="w-4 h-4 mr-1.5" />
          {t('tasks.create', 'Create Task')}
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
                          status={mapPriorityToDesignSystem(task.priority)}
                          label={t(`tasks.priorities.${task.priority}`)}
                        />
                        <StatusPill
                          status={mapStatusToDesignSystem(task.status)}
                          label={t(`tasks.statuses.${task.status}`)}
                        />
                      </div>
                      {task.description && (
                        <p className="text-sm text-text-secondary mb-2">{task.description}</p>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-4 h-4" />
                          <span>{task.patientName}</span>
                        </div>
                        {task.assignedTo && (
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="w-4 h-4" />
                            <span>{task.assignedTo}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as 'todo' | 'in_progress' | 'done')}
                        className="text-sm border border-border-default rounded-[var(--radius-control)] px-2 py-1 bg-bg-surface text-text-primary"
                      >
                        <option value="todo">{t('tasks.statuses.todo', 'To Do')}</option>
                        <option value="in_progress">{t('tasks.statuses.in_progress', 'In Progress')}</option>
                        <option value="done">{t('tasks.statuses.done', 'Done')}</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTask(task)}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(t('tasks.confirmDelete', 'Are you sure you want to delete this task?'))) {
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
        isLoading={createMutation.isPending}
        title={t('tasks.create', 'Create Task')}
      />

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskFormModal
          isOpen={true}
          onClose={() => setEditingTask(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingTask.id, data })}
          encounters={encounters || []}
          isLoading={updateMutation.isPending}
          title={t('tasks.edit', 'Edit Task')}
          initialData={editingTask}
        />
      )}
    </div>
  );
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Task>) => void;
  encounters: Encounter[];
  isLoading: boolean;
  title: string;
  initialData?: Task;
}

function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  encounters,
  isLoading,
  title,
  initialData,
}: TaskFormModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<Task>>({
    encounterId: initialData?.encounterId || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || 'todo',
    priority: initialData?.priority || 'medium',
    dueDate: initialData?.dueDate || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<Task> = { ...formData };
    if (!payload.dueDate) {
      delete payload.dueDate;
    }
    onSubmit(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {t('tasks.encounter', 'Encounter')} *
          </label>
          <select
            value={formData.encounterId}
            onChange={(e) => setFormData({ ...formData, encounterId: e.target.value })}
            className="w-full px-3 py-2 border border-border-default rounded-[var(--radius-control)] bg-bg-surface text-text-primary"
            required
          >
            <option value="">{t('tasks.selectEncounter', 'Select an encounter')}</option>
            {encounters.map((enc) => (
              <option key={enc.id} value={enc.id}>
                {enc.id.substring(0, 8)}... ({enc.status})
              </option>
            ))}
          </select>
        </div>

        <FormInput
          label={t('tasks.title', 'Title')}
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {t('tasks.description', 'Description')}
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-border-default rounded-[var(--radius-control)] bg-bg-surface text-text-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('tasks.status', 'Status')}
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-border-default rounded-[var(--radius-control)] bg-bg-surface text-text-primary"
            >
              <option value="todo">{t('tasks.statuses.todo', 'To Do')}</option>
              <option value="in_progress">{t('tasks.statuses.in_progress', 'In Progress')}</option>
              <option value="done">{t('tasks.statuses.done', 'Done')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('tasks.priority', 'Priority')}
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className="w-full px-3 py-2 border border-border-default rounded-[var(--radius-control)] bg-bg-surface text-text-primary"
            >
              <option value="low">{t('tasks.priorities.low', 'Low')}</option>
              <option value="medium">{t('tasks.priorities.medium', 'Medium')}</option>
              <option value="high">{t('tasks.priorities.high', 'High')}</option>
            </select>
          </div>
        </div>

        <FormInput
          label={t('tasks.dueDate', 'Due Date')}
          type="datetime-local"
          value={formData.dueDate || ''}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
        />

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="secondary" onClick={onClose} type="button">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
