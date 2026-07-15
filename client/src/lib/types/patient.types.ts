export type Role = 'admin' | 'provider' | 'clinical_staff' | 'front_desk';

export interface Address {
  street?: string;
  postal_code?: string;
  city?: string;
  country?: string;
}

export interface Identity {
  document_type?: string;
  country_national?: string;
  scanned_document?: boolean;
}

export interface Financials {
  health_insurance?: string;
  reimbursement?: string;
}

export interface EmergencyContact {
  name?: string;
  relation?: string;
  phone?: string;
  email?: string;
  comments?: string;
}

export interface Physicians {
  attending?: string;
  correspondent?: string;
  other?: string;
}

export interface TransportModes {
  public?: string;
  taxi?: string;
  ambulance?: string;
}

export interface TransportLogistics {
  modes?: TransportModes;
  comments?: string;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: Address;
  identity?: Identity;
  financials?: Financials;
  emergency_contact?: EmergencyContact;
  medical_history?: string;
  medical_history_date?: string;
  physicians?: Physicians;
  transport_logistics?: TransportLogistics;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type PatientSection =
  | 'identity'
  | 'contact'
  | 'financials'
  | 'emergency'
  | 'medical'
  | 'transport'
  | 'notes';

export const PATIENT_WRITE_VISIBILITY: Record<Role, PatientSection[]> = {
  admin: ['identity', 'contact', 'financials', 'emergency', 'medical', 'transport', 'notes'],
  provider: ['emergency', 'medical', 'notes'],
  clinical_staff: ['contact', 'emergency', 'medical', 'transport', 'notes'],
  front_desk: ['identity', 'contact', 'financials', 'emergency', 'transport'],
};

export function canWriteSection(role: string, section: PatientSection): boolean {
  const allowed = PATIENT_WRITE_VISIBILITY[role as Role] ?? [];
  return allowed.includes(section);
}
