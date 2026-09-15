import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '../../core/db/index.js';
import { tasks, encounters, patients } from '../../core/db/schema.js';
import { eq, and, sql, type SQL } from 'drizzle-orm';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { AuditService } from '../audit/audit.service.js';
import type { AppAbility } from '../../core/auth/ability.js';
import { translateDatabaseError } from '../../core/common/utils/database-error.util.js';

/**
 * Shared projection for task reads. `patient_name` is resolved through the
 * task's encounter so clients can display a patient without extra requests.
 */
const taskSelect = {
  id: tasks.id,
  encounter_id: tasks.encounter_id,
  patient_name: sql<string>`${patients.first_name} || ' ' || ${patients.last_name}`,
  title: tasks.title,
  description: tasks.description,
  status: tasks.status,
  priority: tasks.priority,
  assigned_user_id: tasks.assigned_user_id,
  assigned_role: tasks.assigned_role,
  blocking: tasks.blocking,
  due_at: tasks.due_at,
  created_at: tasks.created_at,
  updated_at: tasks.updated_at,
};

/** Joins needed to resolve `patient_name` for any task query. */
export interface FindTasksFilters {
  encounterId?: string;
  assignedUserId?: string;
}

@Injectable()
export class TasksService {
  constructor(private readonly auditService: AuditService) {}

  async create(
    dto: CreateTaskDto,
    userId: string,
    userRole: string,
    ability: AppAbility,
  ) {
    // Check CASL permission
    if (!ability.can('create', 'Task')) {
      throw new ForbiddenException('You are not allowed to create tasks');
    }

    // Verify encounter exists
    const [encounter] = await db
      .select()
      .from(encounters)
      .where(eq(encounters.id, dto.encounter_id))
      .limit(1);

    if (!encounter) {
      throw new NotFoundException(
        `Encounter with ID ${dto.encounter_id} not found`,
      );
    }

    let task;
    try {
      [task] = await db
        .insert(tasks)
        .values({
          encounter_id: dto.encounter_id,
          title: dto.title,
          description: dto.description || null,
          status: dto.status || 'todo',
          priority: dto.priority || 'medium',
          assigned_user_id: dto.assigned_user_id || null,
          assigned_role: dto.assigned_role || null,
          blocking: dto.blocking || false,
          due_at: dto.due_at ? new Date(dto.due_at) : null,
        })
        .returning();
    } catch (error) {
      throw translateDatabaseError(error);
    }

    await this.auditService.record({
      actor_user_id: userId,
      actor_role: userRole,
      action: 'task.created',
      resource_type: 'task',
      resource_id: task.id,
    });

    return this.findOne(task.id);
  }

  async findAll(filters: FindTasksFilters = {}) {
    const conditions: SQL[] = [];

    if (filters.encounterId) {
      conditions.push(eq(tasks.encounter_id, filters.encounterId));
    }
    if (filters.assignedUserId) {
      conditions.push(eq(tasks.assigned_user_id, filters.assignedUserId));
    }

    return db
      .select(taskSelect)
      .from(tasks)
      .leftJoin(encounters, eq(tasks.encounter_id, encounters.id))
      .leftJoin(patients, eq(encounters.patient_id, patients.id))
      .where(and(...conditions))
      .orderBy(tasks.created_at);
  }

  async findByEncounter(encounterId: string) {
    return this.findAll({ encounterId });
  }

  async findOne(id: string) {
    const [task] = await db
      .select(taskSelect)
      .from(tasks)
      .leftJoin(encounters, eq(tasks.encounter_id, encounters.id))
      .leftJoin(patients, eq(encounters.patient_id, patients.id))
      .where(eq(tasks.id, id))
      .limit(1);

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    userId: string,
    userRole: string,
    ability: AppAbility,
  ) {
    // Check CASL permission
    if (!ability.can('update', 'Task')) {
      throw new ForbiddenException('You are not allowed to update tasks');
    }

    const existing = await this.findOne(id);

    const diff = this.auditService.calculateDiff(existing, dto, [
      'title',
      'description',
      'status',
      'priority',
      'assigned_user_id',
      'assigned_role',
      'blocking',
      'due_at',
    ]);

    let updated;
    try {
      [updated] = await db
        .update(tasks)
        .set({
          title: dto.title ?? existing.title,
          description: dto.description ?? existing.description,
          status: dto.status ?? existing.status,
          priority: dto.priority ?? existing.priority,
          assigned_user_id: dto.assigned_user_id ?? existing.assigned_user_id,
          assigned_role: dto.assigned_role ?? existing.assigned_role,
          blocking: dto.blocking ?? existing.blocking,
          due_at: dto.due_at ? new Date(dto.due_at) : existing.due_at,
          updated_at: new Date(),
        })
        .where(eq(tasks.id, id))
        .returning();
    } catch (error) {
      throw translateDatabaseError(error);
    }

    if (diff) {
      await this.auditService.record({
        actor_user_id: userId,
        actor_role: userRole,
        action: 'task.updated',
        resource_type: 'task',
        resource_id: id,
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
    // Check CASL permission
    if (!ability.can('delete', 'Task')) {
      throw new ForbiddenException('You are not allowed to delete tasks');
    }

    await this.findOne(id);

    await this.auditService.record({
      actor_user_id: userId,
      actor_role: userRole,
      action: 'task.deleted',
      resource_type: 'task',
      resource_id: id,
    });

    await db.delete(tasks).where(eq(tasks.id, id));

    return { success: true };
  }
}
