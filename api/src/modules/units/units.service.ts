import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db } from '../db';
import { units, user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { canAccessProperty, canEditProperty } from '../common/access.util';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class UnitsService {
  constructor(private readonly activityService: ActivityService) {}

  async create(data: CreateUnitDto, userId: string) {
    const canEdit = await canEditProperty(data.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    // Get user info
    const [currentUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const [unit] = await db
      .insert(units)
      .values({
        unit_number: data.unit_number,
        unit_name: data.unit_name || null,
        property: data.property,
      })
      .returning();

    // Create activity log
    await this.activityService.createLog({
      entity_type: 'unit',
      entity_id: unit.id,
      action: 'create',
      user_id: userId,
      user_name: currentUser?.name || undefined,
      user_email: currentUser?.email || undefined,
      property_id: data.property,
    });

    return unit;
  }

  async findAll(propertyId: string, userId: string) {
    const hasAccess = await canAccessProperty(propertyId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return db.select().from(units).where(eq(units.property, propertyId));
  }

  async findByProperty(propertyId: string, userId: string) {
    return this.findAll(propertyId, userId);
  }

  async findOne(id: string, userId: string) {
    const [unit] = await db
      .select()
      .from(units)
      .where(eq(units.id, id))
      .limit(1);

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const hasAccess = await canAccessProperty(unit.property, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return unit;
  }

  async update(id: string, data: UpdateUnitDto, userId: string) {
    const [unit] = await db
      .select()
      .from(units)
      .where(eq(units.id, id))
      .limit(1);

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const canEdit = await canEditProperty(unit.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    // Get user info
    const [currentUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // Calculate changes
    const changes = this.activityService.calculateChanges(
      unit,
      data,
      ['unit_number', 'unit_name'],
    );

    const [updated] = await db
      .update(units)
      .set({
        ...data,
        updated: new Date(),
      })
      .where(eq(units.id, id))
      .returning();

    // Create activity log only if there were significant changes
    if (changes) {
      await this.activityService.createLog({
        entity_type: 'unit',
        entity_id: id,
        action: 'update',
        changes,
        user_id: userId,
        user_name: currentUser?.name || undefined,
        user_email: currentUser?.email || undefined,
        property_id: unit.property,
      });
    }

    return updated;
  }

  async remove(id: string, userId: string) {
    const [unit] = await db
      .select()
      .from(units)
      .where(eq(units.id, id))
      .limit(1);

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const canEdit = await canEditProperty(unit.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    // Get user info
    const [currentUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    await db.delete(units).where(eq(units.id, id));

    // Create activity log
    await this.activityService.createLog({
      entity_type: 'unit',
      entity_id: id,
      action: 'delete',
      user_id: userId,
      user_name: currentUser?.name || undefined,
      user_email: currentUser?.email || undefined,
      property_id: unit.property,
    });

    return { success: true };
  }
}