import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '../../core/db/index.js';
import { encounters, patients } from '../../core/db/schema.js';
import { eq, and, gte, lte, sql, type SQL } from 'drizzle-orm';
import { CreateEncounterDto } from './dto/create-encounter.dto.js';
import { UpdateEncounterDto } from './dto/update-encounter.dto.js';
import { AuditService } from '../audit/audit.service.js';
import type { AppAbility } from '../../core/auth/ability.js';
import { translateDatabaseError } from '../../core/common/utils/database-error.util.js';

// Finite State Machine: defines valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

const VALID_STATUSES = Object.keys(STATUS_TRANSITIONS);

// Statuses that end the encounter's lifetime. `phase` is only meaningful while
// an encounter is `in_progress`, so it is cleared when any of these is reached.
const TERMINAL_STATUSES = ['completed', 'cancelled', 'no_show'];

/** Sub-states within `in_progress` (see ADR 0008). */
export const VALID_PHASES = [
  'consultation',
  'awaiting_lab',
  'awaiting_results',
  'treatment',
  'discharge',
];

/** Fields tracked for audit diffing on encounter updates. */
const TRACKED_FIELDS = [
  'status',
  'phase',
  'assigned_to',
  'scheduled_time',
  'notes',
];

export interface FindEncountersFilters {
  patientId?: string;
  from?: string;
  to?: string;
}

/**
 * Shared projection for encounter reads. `patient_name` is a read-only
 * convenience field so clients don't need a second request per encounter.
 */
const encounterSelect = {
  id: encounters.id,
  patient_id: encounters.patient_id,
  patient_name: sql<string>`${patients.first_name} || ' ' || ${patients.last_name}`,
  status: encounters.status,
  phase: encounters.phase,
  assigned_to: encounters.assigned_to,
  scheduled_time: encounters.scheduled_time,
  notes: encounters.notes,
  version: encounters.version,
  created_at: encounters.created_at,
  updated_at: encounters.updated_at,
};

@Injectable()
export class EncountersService {
  constructor(private readonly auditService: AuditService) {}

  async create(
    dto: CreateEncounterDto,
    userId: string,
    userRole: string,
    ability: AppAbility,
  ) {
    // Check CASL permission
    if (!ability.can('create', 'Encounter')) {
      throw new ForbiddenException('You are not allowed to create encounters');
    }

    // Verify patient exists
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, dto.patient_id))
      .limit(1);

    if (!patient) {
      throw new NotFoundException(
        `Patient with ID ${dto.patient_id} not found`,
      );
    }

    let encounter;
    try {
      [encounter] = await db
        .insert(encounters)
        .values({
          patient_id: dto.patient_id,
          status: 'scheduled',
          assigned_to: dto.assigned_to || null,
          scheduled_time: dto.scheduled_time
            ? new Date(dto.scheduled_time)
            : null,
          notes: dto.notes || null,
        })
        .returning();
    } catch (error) {
      throw translateDatabaseError(error);
    }

    await this.auditService.record({
      actor_user_id: userId,
      actor_role: userRole,
      action: 'encounter.created',
      resource_type: 'encounter',
      resource_id: encounter.id,
    });

    return {
      ...encounter,
      patient_name: `${patient.first_name} ${patient.last_name}`,
    };
  }

  /**
   * List encounters, optionally filtered by patient and/or a scheduled-time
   * window. Ordered by `scheduled_time` ascending with walk-ins (NULL
   * `scheduled_time`) sorted last.
   */
  async findAll(filters: FindEncountersFilters = {}) {
    const conditions: SQL[] = [];

    if (filters.patientId) {
      conditions.push(eq(encounters.patient_id, filters.patientId));
    }
    if (filters.from) {
      conditions.push(gte(encounters.scheduled_time, new Date(filters.from)));
    }
    if (filters.to) {
      conditions.push(lte(encounters.scheduled_time, new Date(filters.to)));
    }

    return db
      .select(encounterSelect)
      .from(encounters)
      .leftJoin(patients, eq(encounters.patient_id, patients.id))
      .where(and(...conditions))
      .orderBy(sql`${encounters.scheduled_time} ASC NULLS LAST`);
  }

  async findOne(id: string) {
    const [encounter] = await db
      .select(encounterSelect)
      .from(encounters)
      .leftJoin(patients, eq(encounters.patient_id, patients.id))
      .where(eq(encounters.id, id))
      .limit(1);

    if (!encounter) {
      throw new NotFoundException(`Encounter with ID ${id} not found`);
    }

    return encounter;
  }

  async update(
    id: string,
    dto: UpdateEncounterDto,
    userId: string,
    userRole: string,
    ability: AppAbility,
  ) {
    const existing = await this.findOne(id);

    // Check CASL permission
    if (!ability.can('update', 'Encounter')) {
      throw new ForbiddenException('You are not allowed to update encounters');
    }

    // Validate status transition if status is being updated
    if (dto.status && dto.status !== existing.status) {
      if (!VALID_STATUSES.includes(dto.status)) {
        throw new BadRequestException(`Invalid status: ${dto.status}`);
      }

      const allowedTransitions = STATUS_TRANSITIONS[existing.status];
      if (!allowedTransitions.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot transition from ${existing.status} to ${dto.status}`,
        );
      }

      // Check ownership lock: only assigned user or admin can change status
      if (
        existing.assigned_to &&
        existing.assigned_to !== userId &&
        userRole !== 'admin'
      ) {
        throw new ForbiddenException(
          'Only the assigned staff member or admin can update this encounter',
        );
      }
    }

    if (dto.phase !== undefined && !VALID_PHASES.includes(dto.phase)) {
      throw new BadRequestException(`Invalid phase: ${dto.phase}`);
    }

    // The status this encounter will have once this update is applied.
    const effectiveStatus = dto.status ?? existing.status;

    let nextPhase: string | null;
    if (dto.phase !== undefined) {
      // `phase` is a sub-state of `in_progress` only (see ADR 0008).
      if (effectiveStatus !== 'in_progress') {
        throw new BadRequestException(
          `Cannot set a phase unless the encounter is in progress (status would be ${effectiveStatus})`,
        );
      }
      nextPhase = dto.phase;
    } else if (TERMINAL_STATUSES.includes(effectiveStatus)) {
      // Leaving `in_progress` discards the sub-state.
      nextPhase = null;
    } else {
      nextPhase = existing.phase;
    }

    const diff = this.auditService.calculateDiff(
      existing,
      { ...dto, phase: nextPhase },
      TRACKED_FIELDS,
    );

    let updated;
    try {
      [updated] = await db
        .update(encounters)
        .set({
          status: dto.status ?? existing.status,
          phase: nextPhase,
          assigned_to: dto.assigned_to ?? existing.assigned_to,
          scheduled_time: dto.scheduled_time
            ? new Date(dto.scheduled_time)
            : existing.scheduled_time,
          notes: dto.notes ?? existing.notes,
          version: existing.version + 1,
          updated_at: new Date(),
        })
        .where(
          and(eq(encounters.id, id), eq(encounters.version, existing.version)),
        )
        .returning();
    } catch (error) {
      throw translateDatabaseError(error);
    }

    if (!updated) {
      throw new BadRequestException(
        'Encounter was modified by another user. Please refresh and try again.',
      );
    }

    if (diff) {
      // Phase transitions get their own audit action so status history and
      // sub-state history stay separately queryable (ADR 0008).
      const { phase: phaseDiff, ...otherDiff } = diff;

      if (Object.keys(otherDiff).length > 0) {
        await this.auditService.record({
          actor_user_id: userId,
          actor_role: userRole,
          action: 'encounter.updated',
          resource_type: 'encounter',
          resource_id: id,
          diff: otherDiff,
        });
      }

      if (phaseDiff) {
        await this.auditService.record({
          actor_user_id: userId,
          actor_role: userRole,
          action: 'encounter.phase_changed',
          resource_type: 'encounter',
          resource_id: id,
          diff: { phase: phaseDiff },
        });
      }
    }

    return { ...updated, patient_name: existing.patient_name };
  }

  async remove(
    id: string,
    userId: string,
    userRole: string,
    ability: AppAbility,
  ) {
    const existing = await this.findOne(id);

    // Check CASL permission
    if (!ability.can('delete', 'Encounter')) {
      throw new ForbiddenException('You are not allowed to delete encounters');
    }

    await this.auditService.record({
      actor_user_id: userId,
      actor_role: userRole,
      action: 'encounter.deleted',
      resource_type: 'encounter',
      resource_id: id,
    });

    await db.delete(encounters).where(eq(encounters.id, id));

    return { success: true };
  }
}
