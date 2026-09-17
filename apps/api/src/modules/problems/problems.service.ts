import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '../../core/db/index.js';
import {
  patient_problems,
  patients,
  encounters,
  user,
} from '../../core/db/schema.js';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import { CreateProblemDto, UpdateProblemDto } from './dto/problem.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { problemAuditScope } from '../audit/audit-scope.js';
import type { AppAbility } from '../../core/auth/ability.js';
import { translateDatabaseError } from '../../core/common/utils/database-error.util.js';

/**
 * Fields diffed on update and snapshotted on create/delete.
 *
 * **`description` and `notes` are deliberately excluded.** `GET
 * /api/audit/encounter/:id` is readable by every authenticated role, so the
 * diagnosis wording in a diff would be a PHI leak to `front_desk`. The code and
 * status are metadata: a code alone is not patient-identifying, and status
 * transitions are what an operational timeline needs.
 *
 * See the audit section of docs/contracts/schema.md.
 */
const AUDIT_TRACKED_FIELDS = ['status', 'code', 'code_system'] as const;

/** Shared projection for problem reads. */
const problemSelect = {
  id: patient_problems.id,
  patient_id: patient_problems.patient_id,
  encounter_id: patient_problems.encounter_id,
  patient_name: sql<string>`${patients.first_name} || ' ' || ${patients.last_name}`,
  description: patient_problems.description,
  code: patient_problems.code,
  code_system: patient_problems.code_system,
  diagnosis_slug: patient_problems.diagnosis_slug,
  status: patient_problems.status,
  onset_date: patient_problems.onset_date,
  resolved_date: patient_problems.resolved_date,
  recorded_by: patient_problems.recorded_by,
  recorded_by_name: patient_problems.recorded_by_name,
  notes: patient_problems.notes,
  created_at: patient_problems.created_at,
  updated_at: patient_problems.updated_at,
};

export interface FindProblemsFilters {
  patientId?: string;
  status?: string;
}

@Injectable()
export class ProblemsService {
  constructor(private readonly auditService: AuditService) {}

  async create(
    dto: CreateProblemDto,
    userId: string,
    userRole: string,
    ability: AppAbility,
  ) {
    if (!ability.can('create', 'Problem')) {
      throw new ForbiddenException('You are not allowed to record problems');
    }

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, dto.patient_id))
      .limit(1);

    if (!patient) {
      throw new NotFoundException(
        `Patient with ID ${dto.patient_id} not found`,
      );
    }

    // If an encounter is supplied, it must belong to the same patient —
    // otherwise a problem could be attributed to a visit for someone else.
    if (dto.encounter_id) {
      const [encounter] = await db
        .select({ id: encounters.id, patient_id: encounters.patient_id })
        .from(encounters)
        .where(eq(encounters.id, dto.encounter_id))
        .limit(1);

      if (!encounter) {
        throw new NotFoundException(
          `Encounter with ID ${dto.encounter_id} not found`,
        );
      }

      if (encounter.patient_id !== dto.patient_id) {
        throw new BadRequestException(
          'The encounter does not belong to the specified patient',
        );
      }
    }

    const recordedByName = await this.resolveUserName(userId);

    let problem;
    try {
      [problem] = await db
        .insert(patient_problems)
        .values({
          patient_id: dto.patient_id,
          encounter_id: dto.encounter_id || null,
          description: dto.description,
          code: dto.code || null,
          code_system: dto.code || null ? 'ICD-10' : null,
          diagnosis_slug: dto.diagnosis_slug || null,
          status: dto.status || 'active',
          onset_date: dto.onset_date ? new Date(dto.onset_date) : null,
          resolved_date: dto.resolved_date ? new Date(dto.resolved_date) : null,
          recorded_by: userId,
          recorded_by_name: recordedByName,
          notes: dto.notes || null,
        })
        .returning();
    } catch (error) {
      throw translateDatabaseError(error);
    }

    await this.auditService.record({
      actor_user_id: userId,
      actor_role: userRole,
      action: 'problem.created',
      ...problemAuditScope(problem),
      // Metadata only — see AUDIT_TRACKED_FIELDS.
      diff: {
        status: { from: null, to: problem.status },
        code: { from: null, to: problem.code },
      },
    });

    return this.findOne(problem.id);
  }

  async findAll(filters: FindProblemsFilters = {}) {
    const conditions: SQL[] = [];

    if (filters.patientId) {
      conditions.push(eq(patient_problems.patient_id, filters.patientId));
    }
    if (filters.status) {
      conditions.push(eq(patient_problems.status, filters.status));
    }

    return (
      db
        .select(problemSelect)
        .from(patient_problems)
        .leftJoin(patients, eq(patient_problems.patient_id, patients.id))
        .where(and(...conditions))
        // Active problems first (a clinician scans those), then newest first
        // within each status.
        .orderBy(
          sql`CASE ${patient_problems.status} WHEN 'active' THEN 0 ELSE 1 END`,
          desc(patient_problems.created_at),
        )
    );
  }

  async findOne(id: string) {
    const [problem] = await db
      .select(problemSelect)
      .from(patient_problems)
      .leftJoin(patients, eq(patient_problems.patient_id, patients.id))
      .where(eq(patient_problems.id, id))
      .limit(1);

    if (!problem) {
      throw new NotFoundException(`Problem with ID ${id} not found`);
    }

    return problem;
  }

  async update(
    id: string,
    dto: UpdateProblemDto,
    userId: string,
    userRole: string,
    ability: AppAbility,
  ) {
    if (!ability.can('update', 'Problem')) {
      throw new ForbiddenException('You are not allowed to update problems');
    }

    const existing = await this.findOne(id);

    // Metadata-only diff, so the audit entry never carries diagnosis wording.
    const diff = this.auditService.calculateDiff(existing, dto, [
      ...AUDIT_TRACKED_FIELDS,
    ]);

    // A code change must not leave a stale slug or system behind. Clearing the
    // code clears both, which is what lets a clinician overwrite a catalogue
    // pick with free text.
    const nextCode = dto.code !== undefined ? dto.code || null : existing.code;
    const nextCodeSystem = nextCode ? 'ICD-10' : null;
    const nextSlug =
      dto.code !== undefined
        ? dto.diagnosis_slug || null
        : existing.diagnosis_slug;

    try {
      await db
        .update(patient_problems)
        .set({
          description: dto.description ?? existing.description,
          code: nextCode,
          code_system: nextCodeSystem,
          diagnosis_slug: nextSlug,
          status: dto.status ?? existing.status,
          onset_date: dto.onset_date
            ? new Date(dto.onset_date)
            : existing.onset_date,
          resolved_date: dto.resolved_date
            ? new Date(dto.resolved_date)
            : existing.resolved_date,
          notes: dto.notes ?? existing.notes,
          updated_at: new Date(),
        })
        .where(eq(patient_problems.id, id));
    } catch (error) {
      throw translateDatabaseError(error);
    }

    if (diff) {
      await this.auditService.record({
        actor_user_id: userId,
        actor_role: userRole,
        action: 'problem.updated',
        ...problemAuditScope(existing),
        diff,
      });
    }

    return this.findOne(id);
  }

  async remove(
    id: string,
    userId: string,
    userRole: string,
    ability: AppAbility,
  ) {
    if (!ability.can('delete', 'Problem')) {
      throw new ForbiddenException('You are not allowed to delete problems');
    }

    const existing = await this.findOne(id);

    await this.auditService.record({
      actor_user_id: userId,
      actor_role: userRole,
      action: 'problem.deleted',
      ...problemAuditScope(existing),
      // Metadata only. The description is deliberately not snapshotted.
      diff: {
        status: { from: existing.status, to: null },
        code: { from: existing.code, to: null },
      },
    });

    await db.delete(patient_problems).where(eq(patient_problems.id, id));

    return { success: true };
  }

  /** Resolve a display name for the attribution snapshot. */
  private async resolveUserName(userId: string): Promise<string | null> {
    try {
      const [actor] = await db
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      return actor?.name || actor?.email || null;
    } catch {
      return null;
    }
  }
}
