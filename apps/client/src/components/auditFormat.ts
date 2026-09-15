import type { TFunction } from 'i18next';

export interface AuditDiffEntry {
  from: unknown;
  to: unknown;
}

export type AuditDiff = Record<string, AuditDiffEntry>;

export interface AuditValueContext {
  t: TFunction;
  locale: string;
  resourceType: string;
  resolveUserName?: (id: string) => string;
}

/** Longest value rendered inline before the "show more" toggle kicks in. */
export const MAX_VALUE_LENGTH = 140;

/** Actions produced by the API (`{entity}.{verb}`). */
const KNOWN_ACTIONS = new Set([
  'patient.created',
  'patient.updated',
  'patient.deleted',
  'encounter.created',
  'encounter.updated',
  'encounter.phase_changed',
  'encounter.deleted',
  'task.created',
  'task.updated',
  'task.deleted',
  'user.created',
  'user.status_changed',
  'user.role_changed',
  'admin.seeded',
  'admin.bootstrapped',
]);

/** Fields whose values are timestamps (time is meaningful). */
const DATE_TIME_FIELDS = new Set([
  'scheduled_time',
  'due_at',
  'created_at',
  'updated_at',
]);

/** Fields whose values are dates (time is noise). */
const DATE_ONLY_FIELDS = new Set(['date_of_birth', 'medical_history_date']);

/** Fields whose values are user IDs (resolve to names where possible). */
const ASSIGNEE_FIELDS = new Set(['assigned_to', 'assigned_user_id']);

/**
 * Sub-keys inside patient JSON objects → their translation keys. Keys absent
 * from this map render with a space in place of the underscore (a technical
 * identifier, not a translated string).
 */
const NESTED_FIELD_KEYS: Record<string, string> = {
  document_type: 'patients.fields.documentType',
  document_number: 'patients.fields.documentNumber',
  country_national: 'patients.fields.countryNational',
  scanned_document: 'patients.fields.scannedDocument',
  street: 'patients.fields.addressStreet',
  postal_code: 'patients.fields.addressPostalCode',
  city: 'patients.fields.addressCity',
  country: 'patients.fields.addressCountry',
  health_insurance: 'patients.fields.healthInsurance',
  reimbursement: 'patients.fields.reimbursement',
  relation: 'patients.fields.emergencyRelation',
  attending: 'patients.fields.attendingPhysician',
  correspondent: 'patients.fields.correspondentPhysician',
  other: 'patients.fields.otherPhysician',
  public_transport: 'patients.fields.transportPublic',
  taxi: 'patients.fields.transportTaxi',
  ambulance: 'patients.fields.transportAmbulance',
};

/**
 * Resolve an API action string into a translation key. Unknown actions fall
 * back to `audit.titles.generic` so the UI never renders a raw key.
 */
export function resolveAuditTitleKey(action: string): string {
  return KNOWN_ACTIONS.has(action)
    ? `audit.titles.${action}`
    : 'audit.titles.generic';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatNestedObject(
  value: Record<string, unknown>,
  ctx: AuditValueContext,
): string {
  const parts = Object.entries(value).map(([key, nested]) => {
    const mapped = NESTED_FIELD_KEYS[key];
    const label = mapped ? ctx.t(mapped) : key.replace(/_/g, ' ');
    return `${label}: ${formatNestedValue(nested, ctx)}`;
  });
  return parts.length === 0 ? ctx.t('audit.notSet') : parts.join(' · ');
}

function formatNestedValue(value: unknown, ctx: AuditValueContext): string {
  if (value === null || value === undefined) {
    return ctx.t('audit.notSet');
  }
  if (typeof value === 'boolean') {
    return ctx.t(value ? 'common.yes' : 'common.no');
  }
  if (isPlainObject(value)) {
    return formatNestedObject(value, ctx);
  }
  return String(value);
}

function statusKey(resourceType: string, value: string): string {
  if (resourceType === 'encounter') {
    return `encounters.statuses.${value}`;
  }
  if (resourceType === 'task') {
    return `tasks.statuses.${value}`;
  }
  if (resourceType === 'user') {
    return value === 'suspended' ? 'staff.suspended' : 'staff.active';
  }
  return `encounters.statuses.${value}`;
}

/**
 * Render a single diff value for display. Enums are translated, dates are
 * locale-formatted, user IDs resolve to names, objects collapse into a single
 * `label: value · label: value` line, and everything else renders as-is.
 */
export function formatAuditValue(
  field: string,
  value: unknown,
  ctx: AuditValueContext,
): string {
  if (value === null || value === undefined) {
    return ctx.t('audit.notSet');
  }

  if (typeof value === 'boolean') {
    return ctx.t(value ? 'common.yes' : 'common.no');
  }

  if (DATE_TIME_FIELDS.has(field) || DATE_ONLY_FIELDS.has(field)) {
    const date = parseDate(value);
    if (date) {
      return DATE_ONLY_FIELDS.has(field)
        ? date.toLocaleDateString(ctx.locale)
        : date.toLocaleString(ctx.locale);
    }
  }

  if (ASSIGNEE_FIELDS.has(field) && typeof value === 'string') {
    return ctx.resolveUserName
      ? ctx.resolveUserName(value)
      : `${value.substring(0, 8)}\u2026`;
  }

  if (isPlainObject(value)) {
    return formatNestedObject(value, ctx);
  }

  const str = String(value);

  switch (field) {
    case 'status':
      return ctx.t(statusKey(ctx.resourceType, str), { defaultValue: str });
    case 'phase':
      return ctx.t(`encounters.phases.${str}`, { defaultValue: str });
    case 'priority':
      return ctx.t(`tasks.priorities.${str}`, { defaultValue: str });
    case 'role':
    case 'assigned_role':
      return ctx.t(`staff.roles.${str}`, { defaultValue: str });
    default:
      return str;
  }
}