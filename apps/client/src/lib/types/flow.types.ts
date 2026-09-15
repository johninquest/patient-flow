/**
 * Shared domain types for encounters, tasks, audit logs, and flow data.
 *
 * These mirror the API contract in `docs/contracts/api_spec.md` exactly —
 * the API uses snake_case field names, so these types do too. Keeping one
 * definition here avoids the drift that previously caused patient names to
 * render blank and task creation to fail validation.
 */

export type EncounterStatus =
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

/** Sub-state within `in_progress` (see ADR 0008). */
export type EncounterPhase =
  | 'consultation'
  | 'awaiting_lab'
  | 'awaiting_results'
  | 'treatment'
  | 'discharge';

export const ENCOUNTER_PHASES: EncounterPhase[] = [
  'consultation',
  'awaiting_lab',
  'awaiting_results',
  'treatment',
  'discharge',
];

export interface Encounter {
  id: string;
  patient_id: string;
  patient_name: string;
  status: EncounterStatus;
  phase: EncounterPhase | null;
  assigned_to: string | null;
  scheduled_time: string | null;
  notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  encounter_id: string;
  patient_name: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_user_id: string | null;
  assigned_role: string | null;
  blocking: boolean;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  diff?: Record<string, { from: unknown; to: unknown }>;
  ip_address?: string;
  created_at: string;
}

/** User projection returned by `GET /api/users/assignable`. */
export interface AssignableUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  title: string | null;
}

/** A single card on the patient flow board. */
export interface FlowEncounter {
  id: string;
  patient_id: string;
  patient_name: string;
  status: EncounterStatus;
  phase: EncounterPhase | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  scheduled_time: string | null;
  updated_at: string;
  task_count: number;
  task_done_count: number;
  task_blocking_open_count: number;
}

/**
 * Maps an encounter status to a design-system status type.
 * `no_show` and `cancelled` both map to `delayed` — they are visually
 * distinguished by their label, never by colour alone.
 */
export function encounterStatusToDesignSystem(
  status: EncounterStatus,
): 'waiting' | 'in_progress' | 'ready' | 'delayed' {
  switch (status) {
    case 'scheduled':
    case 'checked_in':
      return 'waiting';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'ready';
    case 'cancelled':
    case 'no_show':
      return 'delayed';
    default:
      return 'waiting';
  }
}

/** Maps a task status to a design-system status type. */
export function taskStatusToDesignSystem(
  status: TaskStatus,
): 'waiting' | 'in_progress' | 'ready' {
  switch (status) {
    case 'todo':
      return 'waiting';
    case 'in_progress':
      return 'in_progress';
    case 'done':
    default:
      return 'ready';
  }
}

/** Maps a task priority to a design-system status type. */
export function taskPriorityToDesignSystem(
  priority: TaskPriority,
): 'waiting' | 'in_progress' | 'ready' | 'delayed' {
  switch (priority) {
    case 'high':
      return 'delayed';
    case 'medium':
      return 'waiting';
    case 'low':
    default:
      return 'ready';
  }
}