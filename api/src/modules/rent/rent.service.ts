import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '../db';
import { rent_entries, tenants, user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { canAccessProperty, canEditProperty } from '../common/access.util';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class RentService {
  constructor(private readonly activityService: ActivityService) {}

  async findByProperty(propertyId: string, userId: string) {
    const canAccess = await canAccessProperty(propertyId, userId);
    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Get all rent entries for tenants of this property
    const entries = await db
      .select({
        id: rent_entries.id,
        tenant: rent_entries.tenant,
        amount: rent_entries.amount,
        payment_date: rent_entries.payment_date,
        rent_month: rent_entries.rent_month,
        notes: rent_entries.notes,
        recorded_by: rent_entries.recorded_by,
        created: rent_entries.created,
        updated: rent_entries.updated,
        tenant_first_name: tenants.first_name,
        tenant_last_name: tenants.last_name,
      })
      .from(rent_entries)
      .innerJoin(tenants, eq(rent_entries.tenant, tenants.id))
      .where(eq(tenants.property, propertyId))
      .orderBy(rent_entries.payment_date);

    return entries;
  }

  async findByTenant(tenantId: string, userId: string) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const canAccess = await canAccessProperty(tenant.property, userId);
    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }

    return db
      .select()
      .from(rent_entries)
      .where(eq(rent_entries.tenant, tenantId))
      .orderBy(rent_entries.payment_date);
  }

  async findOne(id: string, userId: string) {
    const [entry] = await db
      .select()
      .from(rent_entries)
      .where(eq(rent_entries.id, id))
      .limit(1);

    if (!entry) {
      throw new NotFoundException('Rent entry not found');
    }

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, entry.tenant))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const canAccess = await canAccessProperty(tenant.property, userId);
    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }

    return entry;
  }

  async create(data: CreateRentDto, userId: string) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, data.tenant))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const canEdit = await canEditProperty(tenant.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    // Get user info for activity log
    const [currentUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const [entry] = await db
      .insert(rent_entries)
      .values({
        tenant: data.tenant,
        amount: data.amount.toString(),
        payment_date: new Date(data.payment_date),
        rent_month: data.rent_month,
        payment_method: data.payment_method,
        notes: data.notes,
        recorded_by: userId,
      })
      .returning();

    // Create activity log
    await this.activityService.createLog({
      entity_type: 'rent_entry',
      entity_id: entry.id,
      action: 'create',
      user_id: userId,
      user_name: currentUser?.name || undefined,
      user_email: currentUser?.email || undefined,
      property_id: tenant.property,
    });

    return entry;
  }

  async update(id: string, data: UpdateRentDto, userId: string) {
    const [entry] = await db
      .select()
      .from(rent_entries)
      .where(eq(rent_entries.id, id))
      .limit(1);

    if (!entry) {
      throw new NotFoundException('Rent entry not found');
    }

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, entry.tenant))
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
      entry,
      data,
      ['amount', 'payment_date', 'rent_month', 'payment_method', 'notes'],
    );

    const [updated] = await db
      .update(rent_entries)
      .set({
        ...data,
        amount: data.amount?.toString(),
        payment_date: data.payment_date ? new Date(data.payment_date) : undefined,
        updated: new Date(),
      })
      .where(eq(rent_entries.id, id))
      .returning();

    // Create activity log only if there were significant changes
    if (changes) {
      await this.activityService.createLog({
        entity_type: 'rent_entry',
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
    const [entry] = await db
      .select()
      .from(rent_entries)
      .where(eq(rent_entries.id, id))
      .limit(1);

    if (!entry) {
      throw new NotFoundException('Rent entry not found');
    }

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, entry.tenant))
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

    await db.delete(rent_entries).where(eq(rent_entries.id, id));

    // Create activity log
    await this.activityService.createLog({
      entity_type: 'rent_entry',
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