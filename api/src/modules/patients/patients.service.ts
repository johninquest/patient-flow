import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../../core/db';
import { patients } from '../../core/db/schema';
import { eq } from 'drizzle-orm';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { AuditService } from '../audit/audit.service';
import {
  filterPatientByRole,
  assertCanWriteFields,
} from './patient-visibility';

const PATIENT_FIELDS_TO_TRACK = [
  'first_name',
  'last_name',
  'date_of_birth',
  'phone',
  'email',
  'address',
  'identity',
  'financials',
  'emergency_contact',
  'medical_history',
  'medical_history_date',
  'physicians',
  'transport_logistics',
  'notes',
];

@Injectable()
export class PatientsService {
  constructor(private readonly auditService: AuditService) {}

  async create(dto: CreatePatientDto, userId: string, userRole: string) {
    assertCanWriteFields(userRole, Object.keys(dto));

    const [patient] = await db
      .insert(patients)
      .values({
        first_name: dto.first_name,
        last_name: dto.last_name,
        date_of_birth: dto.date_of_birth ? new Date(dto.date_of_birth) : null,
        phone: dto.phone || null,
        email: dto.email || null,
        address: dto.address || null,
        identity: dto.identity || null,
        financials: dto.financials || null,
        emergency_contact: dto.emergency_contact || null,
        medical_history: dto.medical_history || null,
        medical_history_date: dto.medical_history_date
          ? new Date(dto.medical_history_date)
          : null,
        physicians: dto.physicians || null,
        transport_logistics: dto.transport_logistics || null,
        notes: dto.notes || null,
      })
      .returning();

    await this.auditService.record({
      actor_user_id: userId,
      actor_role: userRole,
      action: 'patient.created',
      resource_type: 'patient',
      resource_id: patient.id,
    });

    return filterPatientByRole(patient, userRole);
  }

  async findAll(userRole: string) {
    const allPatients = await db.select().from(patients);
    return allPatients.map((p) => filterPatientByRole(p, userRole));
  }

  async findOne(id: string, userRole: string) {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return filterPatientByRole(patient, userRole);
  }

  async update(
    id: string,
    dto: UpdatePatientDto,
    userId: string,
    userRole: string,
  ) {
    assertCanWriteFields(userRole, Object.keys(dto));

    const existing = await this.findOneInternal(id);

    const diff = this.auditService.calculateDiff(
      existing,
      dto,
      PATIENT_FIELDS_TO_TRACK,
    );

    const [updated] = await db
      .update(patients)
      .set({
        first_name: dto.first_name ?? existing.first_name,
        last_name: dto.last_name ?? existing.last_name,
        date_of_birth: dto.date_of_birth
          ? new Date(dto.date_of_birth)
          : existing.date_of_birth,
        phone: dto.phone ?? existing.phone,
        email: dto.email ?? existing.email,
        address: dto.address ?? existing.address,
        identity: dto.identity ?? existing.identity,
        financials: dto.financials ?? existing.financials,
        emergency_contact: dto.emergency_contact ?? existing.emergency_contact,
        medical_history: dto.medical_history ?? existing.medical_history,
        medical_history_date: dto.medical_history_date
          ? new Date(dto.medical_history_date)
          : existing.medical_history_date,
        physicians: dto.physicians ?? existing.physicians,
        transport_logistics:
          dto.transport_logistics ?? existing.transport_logistics,
        notes: dto.notes ?? existing.notes,
        updated_at: new Date(),
      })
      .where(eq(patients.id, id))
      .returning();

    if (diff) {
      await this.auditService.record({
        actor_user_id: userId,
        actor_role: userRole,
        action: 'patient.updated',
        resource_type: 'patient',
        resource_id: id,
        diff,
      });
    }

    return filterPatientByRole(updated, userRole);
  }

  async remove(id: string, userId: string, userRole: string) {
    await this.findOneInternal(id);

    await this.auditService.record({
      actor_user_id: userId,
      actor_role: userRole,
      action: 'patient.deleted',
      resource_type: 'patient',
      resource_id: id,
    });

    await db.delete(patients).where(eq(patients.id, id));

    return { success: true };
  }

  /** Internal fetch without role filtering — used by update/remove. */
  private async findOneInternal(id: string) {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient;
  }
}
