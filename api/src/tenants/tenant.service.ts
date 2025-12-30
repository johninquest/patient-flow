import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db } from '../db';
import { tenants, user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { canAccessProperty, canEditProperty } from '../common/access.util';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class TenantService {
  constructor(private readonly activityService: ActivityService) {}

  async create(data: CreateTenantDto, userId: string) {
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

    const [tenant] = await db
      .insert(tenants)
      .values({
        first_name: data.first_name,
        last_name: data.last_name,
        preferred_name: data.preferred_name || null,
        id_card_number: data.id_card_number || null,
        phone: data.phone,
        property: data.property,
        unit: data.unit || null,
        active: data.active ?? true,
      })
      .returning();

    // Create activity log
    await this.activityService.createLog({
      entity_type: 'tenant',
      entity_id: tenant.id,
      action: 'create',
      user_id: userId,
      user_name: currentUser?.name || undefined,
      user_email: currentUser?.email || undefined,
      property_id: data.property,
    });

    return tenant;
  }

  async findAll(propertyId: string, userId: string) {
    const hasAccess = await canAccessProperty(propertyId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return db.select().from(tenants).where(eq(tenants.property, propertyId));
  }

  async findByProperty(propertyId: string, userId: string) {
    return this.findAll(propertyId, userId);
  }

  async findOne(id: string, userId: string) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const hasAccess = await canAccessProperty(tenant.property, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return tenant;
  }

  async update(id: string, data: UpdateTenantDto, userId: string) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const canEdit = await canEditProperty(tenant.property, userId);
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
      tenant,
      data,
      ['first_name', 'last_name', 'phone', 'unit', 'active'],
    );

    const [updated] = await db
      .update(tenants)
      .set({
        ...data,
        updated: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    // Create activity log only if there were significant changes
    if (changes) {
      await this.activityService.createLog({
        entity_type: 'tenant',
        entity_id: id,
        action: 'update',
        changes,
        user_id: userId,
        user_name: currentUser?.name || undefined,
        user_email: currentUser?.email || undefined,
        property_id: tenant.property,
      });
    }

    return updated;
  }

  async remove(id: string, userId: string) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const canEdit = await canEditProperty(tenant.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    // Get user info
    const [currentUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    await db.delete(tenants).where(eq(tenants.id, id));

    // Create activity log
    await this.activityService.createLog({
      entity_type: 'tenant',
      entity_id: id,
      action: 'delete',
      user_id: userId,
      user_name: currentUser?.name || undefined,
      user_email: currentUser?.email || undefined,
      property_id: tenant.property,
    });

    return { success: true };
  }
}