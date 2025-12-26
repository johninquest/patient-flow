import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '../db';
import { user_access, properties, user } from '../db/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class UserAccessService {
  async findByProperty(propertyId: string, userId: string) {
    // Check if user owns the property
    const isOwner = await this.isPropertyOwner(propertyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only property owners can view access list');
    }

    const accessList = await db
      .select({
        id: user_access.id,
        user: user_access.user,
        property: user_access.property,
        role: user_access.role,
        granted_by: user_access.granted_by,
        created: user_access.created,
        updated: user_access.updated,
        user_name: user.name,
        user_email: user.email,
      })
      .from(user_access)
      .innerJoin(user, eq(user_access.user, user.id))
      .where(eq(user_access.property, propertyId));

    return accessList;
  }

  async getMyAccess(userId: string) {
    const accessList = await db
      .select({
        id: user_access.id,
        user: user_access.user,
        property: user_access.property,
        role: user_access.role,
        granted_by: user_access.granted_by,
        created: user_access.created,
        updated: user_access.updated,
        property_name: properties.name,
        property_city: properties.city,
        property_country: properties.country,
      })
      .from(user_access)
      .innerJoin(properties, eq(user_access.property, properties.id))
      .where(eq(user_access.user, userId));

    return accessList;
  }

  async getUserRole(propertyId: string, userId: string): Promise<string | null> {
    // Check if user owns the property
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.owner, userId)))
      .limit(1);

    if (property) return 'owner';

    // Check user_access
    const [access] = await db
      .select()
      .from(user_access)
      .where(
        and(eq(user_access.property, propertyId), eq(user_access.user, userId)),
      )
      .limit(1);

    return access?.role || null;
  }

  async findUserByEmail(email: string) {
    const [foundUser] = await db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    return foundUser || null;
  }

  async grantAccess(
    data: { user: string; property: string; role: string },
    grantedBy: string,
  ) {
    // Check if granter owns the property
    const isOwner = await this.isPropertyOwner(data.property, grantedBy);
    if (!isOwner) {
      throw new ForbiddenException('Only property owners can grant access');
    }

    // Check if access already exists
    const [existing] = await db
      .select()
      .from(user_access)
      .where(
        and(
          eq(user_access.property, data.property),
          eq(user_access.user, data.user),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException('User already has access to this property');
    }

    const [access] = await db
      .insert(user_access)
      .values({
        user: data.user,
        property: data.property,
        role: data.role,
        granted_by: grantedBy,
      })
      .returning();

    return access;
  }

  async updateAccess(id: string, data: { role: string }, userId: string) {
    // Get access record
    const [access] = await db
      .select()
      .from(user_access)
      .where(eq(user_access.id, id))
      .limit(1);

    if (!access) {
      throw new NotFoundException('Access record not found');
    }

    // Check if user owns the property
    const isOwner = await this.isPropertyOwner(access.property, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only property owners can update access');
    }

    const [updated] = await db
      .update(user_access)
      .set({ role: data.role })
      .where(eq(user_access.id, id))
      .returning();

    return updated;
  }

  async revokeAccess(id: string, userId: string) {
    // Get access record
    const [access] = await db
      .select()
      .from(user_access)
      .where(eq(user_access.id, id))
      .limit(1);

    if (!access) {
      throw new NotFoundException('Access record not found');
    }

    // Check if user owns the property
    const isOwner = await this.isPropertyOwner(access.property, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only property owners can revoke access');
    }

    await db.delete(user_access).where(eq(user_access.id, id));
    return { success: true };
  }

  private async isPropertyOwner(
    propertyId: string,
    userId: string,
  ): Promise<boolean> {
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.owner, userId)))
      .limit(1);

    return !!property;
  }
}

