import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '../db';
import { units, properties, user_access } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  async findByProperty(propertyId: string, userId: string) {
    // Check if user has access to the property
    const hasAccess = await this.checkPropertyAccess(propertyId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return db
      .select()
      .from(units)
      .where(eq(units.property, propertyId))
      .orderBy(units.unit_number);
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

    // Check access to property
    const hasAccess = await this.checkPropertyAccess(unit.property, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return unit;
  }

  async create(data: CreateUnitDto, userId: string) {
    // Check if user has edit access to the property
    const canEdit = await this.checkPropertyEditAccess(data.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    const [unit] = await db
      .insert(units)
      .values({
        unit_name: data.unit_name,
        unit_number: data.unit_number,
        property: data.property,
      })
      .returning();

    return unit;
  }

  async update(id: string, data: UpdateUnitDto, userId: string) {
    // Get unit first
    const [unit] = await db
      .select()
      .from(units)
      .where(eq(units.id, id))
      .limit(1);

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    // Check if user has edit access to the property
    const canEdit = await this.checkPropertyEditAccess(unit.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: any = {
      updated: new Date(),
    };

    if (data.unit_name !== undefined) updateData.unit_name = data.unit_name;
    if (data.unit_number !== undefined) updateData.unit_number = data.unit_number;

    const [updatedUnit] = await db
      .update(units)
      .set(updateData)
      .where(eq(units.id, id))
      .returning();

    return updatedUnit;
  }

  async remove(id: string, userId: string) {
    // Get unit first
    const [unit] = await db
      .select()
      .from(units)
      .where(eq(units.id, id))
      .limit(1);

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    // Check if user has edit access to the property
    const canEdit = await this.checkPropertyEditAccess(unit.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    await db.delete(units).where(eq(units.id, id));
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