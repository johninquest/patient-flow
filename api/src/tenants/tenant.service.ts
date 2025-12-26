import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '../db';
import { tenants, properties, user_access } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantService {
  async findByProperty(propertyId: string, userId: string) {
    // Check if user has access to the property
    const hasAccess = await this.checkPropertyAccess(propertyId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return db
      .select()
      .from(tenants)
      .where(eq(tenants.property, propertyId))
      .orderBy(tenants.last_name, tenants.first_name);
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

    // Check access to property
    const hasAccess = await this.checkPropertyAccess(tenant.property, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return tenant;
  }

  async create(data: CreateTenantDto, userId: string) {
    // Check if user has edit access to the property
    const canEdit = await this.checkPropertyEditAccess(data.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    const [tenant] = await db
      .insert(tenants)
      .values({
        first_name: data.first_name,
        last_name: data.last_name,
        preferred_name: data.preferred_name,
        id_card_number: data.id_card_number,
        phone: data.phone,
        property: data.property,
        unit: data.unit,
        active: data.active ?? true,
      })
      .returning();

    return tenant;
  }

  async update(id: string, data: UpdateTenantDto, userId: string) {
    // Get tenant first
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if user has edit access to the property
    const canEdit = await this.checkPropertyEditAccess(tenant.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: any = {
      updated: new Date(),
    };

    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (data.preferred_name !== undefined) updateData.preferred_name = data.preferred_name;
    if (data.id_card_number !== undefined) updateData.id_card_number = data.id_card_number;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.active !== undefined) updateData.active = data.active;

    const [updatedTenant] = await db
      .update(tenants)
      .set(updateData)
      .where(eq(tenants.id, id))
      .returning();

    return updatedTenant;
  }

  async remove(id: string, userId: string) {
    // Get tenant first
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if user has edit access to the property
    const canEdit = await this.checkPropertyEditAccess(tenant.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    await db.delete(tenants).where(eq(tenants.id, id));
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

    // Check if user has shared access
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

    // Check if user has manager access
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