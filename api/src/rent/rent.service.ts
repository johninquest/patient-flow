import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '../db';
import { rent_entries, tenants, properties, user_access } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';

@Injectable()
export class RentService {
  async findByProperty(propertyId: string, userId: string) {
    // Check if user has access to the property
    const canAccess = await this.checkPropertyAccess(propertyId, userId);
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
    // Get tenant first to check property access
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if user has access to the property
    const canAccess = await this.checkPropertyAccess(tenant.property, userId);
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

    // Get tenant to check property access
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, entry.tenant))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if user has access to the property
    const canAccess = await this.checkPropertyAccess(tenant.property, userId);
    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }

    return entry;
  }

  async create(data: CreateRentDto, userId: string) {
    // Get tenant to check property access
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, data.tenant))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if user has edit access to the property
    const canEdit = await this.checkPropertyEditAccess(tenant.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    const [entry] = await db
      .insert(rent_entries)
      .values({
        tenant: data.tenant,
        amount: data.amount.toString(),
        payment_date: new Date(data.payment_date),
        rent_month: data.rent_month,
        notes: data.notes,
        recorded_by: userId,
      })
      .returning();

    return entry;
  }

  async update(id: string, data: UpdateRentDto, userId: string) {
    // Get entry first
    const [entry] = await db
      .select()
      .from(rent_entries)
      .where(eq(rent_entries.id, id))
      .limit(1);

    if (!entry) {
      throw new NotFoundException('Rent entry not found');
    }

    // Get tenant to check property access
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, entry.tenant))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if user has edit access to the property
    const canEdit = await this.checkPropertyEditAccess(tenant.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: any = {};
    if (data.amount !== undefined) updateData.amount = data.amount.toString();
    if (data.payment_date) updateData.payment_date = new Date(data.payment_date);
    if (data.rent_month) updateData.rent_month = data.rent_month;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const [updated] = await db
      .update(rent_entries)
      .set(updateData)
      .where(eq(rent_entries.id, id))
      .returning();

    return updated;
  }

  async remove(id: string, userId: string) {
    // Get entry first
    const [entry] = await db
      .select()
      .from(rent_entries)
      .where(eq(rent_entries.id, id))
      .limit(1);

    if (!entry) {
      throw new NotFoundException('Rent entry not found');
    }

    // Get tenant to check property access
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, entry.tenant))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if user has edit access to the property
    const canEdit = await this.checkPropertyEditAccess(tenant.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    await db.delete(rent_entries).where(eq(rent_entries.id, id));
    return { success: true };
  }

  private async checkPropertyAccess(
    propertyId: string,
    userId: string,
  ): Promise<boolean> {
    // Check if user owns the property
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.owner, userId)))
      .limit(1);

    if (property) return true;

    // Check if user has access via user_access
    const [access] = await db
      .select()
      .from(user_access)
      .where(
        and(
          eq(user_access.property, propertyId),
          eq(user_access.user, userId),
        ),
      )
      .limit(1);

    return !!access;
  }

  private async checkPropertyEditAccess(
    propertyId: string,
    userId: string,
  ): Promise<boolean> {
    // Check if user owns the property
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.owner, userId)))
      .limit(1);

    if (property) return true;

    // Check if user has manager access via user_access
    const [access] = await db
      .select()
      .from(user_access)
      .where(
        and(
          eq(user_access.property, propertyId),
          eq(user_access.user, userId),
          eq(user_access.role, 'manager'),
        ),
      )
      .limit(1);

    return !!access;
  }
}