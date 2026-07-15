import { ForbiddenException } from '@nestjs/common';

export type Role = 'admin' | 'provider' | 'clinical_staff' | 'front_desk';

export type PatientSection =
  | 'identity'
  | 'contact'
  | 'financials'
  | 'emergency'
  | 'medical'
  | 'transport'
  | 'notes';

/**
 * Maps each section to the patient fields (DB column names) it covers.
 * Core identity fields (id, first_name, last_name, date_of_birth, email, phone,
 * created_at, updated_at) are always visible and not part of any section.
 */
export const SECTION_FIELDS: Record<PatientSection, string[]> = {
  identity: ['identity'],
  contact: ['address'],
  financials: ['financials'],
  emergency: ['emergency_contact'],
  medical: ['medical_history', 'medical_history_date', 'physicians'],
  transport: ['transport_logistics'],
  notes: ['notes'],
};

/** Which sections each role can READ. */
export const PATIENT_READ_VISIBILITY: Record<Role, PatientSection[]> = {
  admin: [
    'identity',
    'contact',
    'financials',
    'emergency',
    'medical',
    'transport',
    'notes',
  ],
  provider: [
    'identity',
    'contact',
    'financials',
    'emergency',
    'medical',
    'transport',
    'notes',
  ],
  clinical_staff: [
    'identity',
    'contact',
    'emergency',
    'medical',
    'transport',
    'notes',
  ],
  front_desk: ['identity', 'contact', 'financials', 'emergency', 'transport'],
};

/** Which sections each role can WRITE. */
export const PATIENT_WRITE_VISIBILITY: Record<Role, PatientSection[]> = {
  admin: [
    'identity',
    'contact',
    'financials',
    'emergency',
    'medical',
    'transport',
    'notes',
  ],
  provider: ['emergency', 'medical', 'notes'],
  clinical_staff: ['contact', 'emergency', 'medical', 'transport', 'notes'],
  front_desk: ['identity', 'contact', 'financials', 'emergency', 'transport'],
};

/**
 * Returns a copy of the patient object with only the fields the given role
 * is permitted to read. Core identity fields are always included.
 */
export function filterPatientByRole<T extends Record<string, any>>(
  patient: T,
  role: string,
): Partial<T> {
  const allowedSections = PATIENT_READ_VISIBILITY[role as Role] ?? [];
  const allowedFields = new Set<string>([
    'id',
    'first_name',
    'last_name',
    'date_of_birth',
    'email',
    'phone',
    'created_at',
    'updated_at',
  ]);

  for (const section of allowedSections) {
    for (const field of SECTION_FIELDS[section]) {
      allowedFields.add(field);
    }
  }

  const result: Record<string, any> = {};
  for (const key of Object.keys(patient)) {
    if (allowedFields.has(key)) {
      result[key] = patient[key];
    }
  }
  return result as Partial<T>;
}

/**
 * Throws ForbiddenException if the DTO contains fields outside the caller's
 * writable sections.
 */
export function assertCanWriteFields(
  role: string,
  providedFields: string[],
): void {
  const allowedSections = PATIENT_WRITE_VISIBILITY[role as Role] ?? [];
  const allowedFields = new Set<string>([
    'first_name',
    'last_name',
    'date_of_birth',
    'email',
    'phone',
  ]);

  for (const section of allowedSections) {
    for (const field of SECTION_FIELDS[section]) {
      allowedFields.add(field);
    }
  }

  const disallowed = providedFields.filter((f) => !allowedFields.has(f));
  if (disallowed.length > 0) {
    throw new ForbiddenException(
      `Your role (${role}) cannot write the following fields: ${disallowed.join(', ')}`,
    );
  }
}
