import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '../../core/db';
import { encounters, patients } from '../../core/db/schema';
import { eq, and } from 'drizzle-orm';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { UpdateEncounterDto } from './dto/update-encounter.dto';
import { AuditService } from '../audit/audit.service';
import { AppAbility } from '../../core/auth/ability';

// Finite State Machine: defines valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['checked_in', 'cancelled'],
  checked_in: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const VALID_STATUSES = Object.keys(STATUS_TRANSITIONS);

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

    const [encounter] = await db
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

    await this.auditService.record({
      actor_user_id: userId,
      actor_role: userRole,
      action: 'encounter.created',
      resource_type: 'encounter',
      resource_id: encounter.id,
    });

    return encounter;
  }

  async findAll() {
    return db.select().from(encounters);
  }

  async findOne(id: string) {
    const [encounter] = await db
      .select()
      .from(encounters)
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

    const diff = this.auditService.calculateDiff(existing, dto, [
      'status',
      'assigned_to',
      'scheduled_time',
      'notes',
    ]);

    // Optimistic locking: increment version
    const [updated] = await db
      .update(encounters)
      .set({
        status: dto.status ?? existing.status,
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

    if (!updated) {
      throw new BadRequestException(
        'Encounter was modified by another user. Please refresh and try again.',
      );
    }

    if (diff) {
      await this.auditService.record({
        actor_user_id: userId,
        actor_role: userRole,
        action: 'encounter.updated',
        resource_type: 'encounter',
        resource_id: id,
        diff,
      });
    }

    return updated;
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
