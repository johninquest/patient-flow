import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, FormInput, FormSelect, Modal } from './ui';
import type {
  AssignableUser,
  Encounter,
  Task,
  TaskPriority,
  TaskStatus,
} from '../lib/types/flow.types';

/**
 * Shape of the create/update payload sent to the API.
 *
 * Only explicitly-provided fields are included — the API schemas are `.strict()`,
 * and `undefined` values are dropped by JSON serialisation but would still be
 * rejected if sent as explicit keys.
 */
export interface TaskPayload {
  encounter_id?: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_user_id?: string;
  blocking?: boolean;
  due_at?: string;
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskPayload) => void;
  /** Encounters offered in the picker. Scope these to the patient when known. */
  encounters: Encounter[];
  staff: AssignableUser[];
  isLoading: boolean;
  title: string;
  initialData?: Task;
  /** When true, the encounter cannot be changed (editing an existing task). */
  lockEncounter?: boolean;
  /**
   * Pre-selects an encounter and hides the picker. Used when the encounter is
   * already implied by the surrounding screen, so the user never has to choose.
   */
  presetEncounterId?: string;
}

/**
 * Create/edit form for a task.
 *
 * Shared by the Tasks page (clinic-wide), the encounter detail page (encounter
 * implied) and the patient detail page (encounter scoped to the patient). It was
 * previously duplicated as `TaskFormModal` in `Tasks.tsx` and `EncounterTaskForm`
 * in `EncounterDetail.tsx`; keeping one copy means the strict-payload rules and
 * field set stay in step across all three entry points.
 */
export function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  encounters,
  staff,
  isLoading,
  title,
  initialData,
  lockEncounter = false,
  presetEncounterId,
}: TaskFormModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    encounter_id: initialData?.encounter_id || presetEncounterId || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || ('todo' as TaskStatus),
    priority: initialData?.priority || ('medium' as TaskPriority),
    assigned_user_id: initialData?.assigned_user_id || '',
    blocking: initialData?.blocking || false,
    due_at: initialData?.due_at ? initialData.due_at.slice(0, 16) : '',
  });

  // An implied encounter is fixed for the lifetime of the modal.
  const encounterLocked = lockEncounter || !!presetEncounterId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
        {!encounterLocked && (
          <FormSelect
            label={t('tasks.encounter')}
            value={formData.encounter_id}
            placeholder={t('tasks.selectEncounter')}
            options={encounters.map((enc) => ({
              value: enc.id,
              label: `${enc.patient_name} — ${t(`encounters.statuses.${enc.status}`)}`,
            }))}
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
          <label htmlFor="task-blocking" className="text-sm text-text-primary">
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
