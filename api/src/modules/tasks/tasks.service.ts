import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db } from '../../core/db';
import { tasks, encounters } from '../../core/db/schema';
import { eq } from 'drizzle-orm';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuditService } from '../audit/audit.service';
import { AppAbility } from '../../core/auth/ability';

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

    const [task] = await db
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

    await this.auditService.record({
      actor_user_id: userId,
      actor_role: userRole,
      action: 'task.created',
      resource_type: 'task',
      resource_id: task.id,
    });

    return task;
  }

  async findAll() {
    return db.select().from(tasks);
  }

  async findByEncounter(encounterId: string) {
    return db.select().from(tasks).where(eq(tasks.encounter_id, encounterId));
  }

  async findOne(id: string) {
    const [task] = await db
      .select()
      .from(tasks)
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

    const [updated] = await db
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

    return updated;
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
