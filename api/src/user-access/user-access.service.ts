import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '../db';
import { user_access, properties, user } from '../db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { isPropertyOwner } from '../common/access.util';
import { alias } from 'drizzle-orm/pg-core';

@Injectable()
export class UserAccessService {
  async findByProperty(propertyId: string, userId: string) {
    const isOwner = await isPropertyOwner(propertyId, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only property owners can view access list');
    }

    // Create a proper alias for the granter user
    const granter = alias(user, 'granter');

    const accessList = await db
      .select({
        id: user_access.id,
        user: user_access.user,
        pending_email: user_access.pending_email,
        property: user_access.property,
        role: user_access.role,
        granted_by: user_access.granted_by,
        created: user_access.created,
        updated: user_access.updated,
        user_name: user.name,
        user_email: user.email,
        granted_by_name: granter.name,
        granted_by_email: granter.email,
      })
      .from(user_access)
      .leftJoin(user, eq(user_access.user, user.id))
      .innerJoin(granter, eq(user_access.granted_by, granter.id))
      .where(eq(user_access.property, propertyId));

    return accessList;
  }

  async getMyAccess(userId: string) {
    // Create a proper alias for the granter user
    const granter = alias(user, 'granter');

    const accessList = await db
      .select({
        id: user_access.id,
        user: user_access.user,
        pending_email: user_access.pending_email,
        property: user_access.property,
        role: user_access.role,
        granted_by: user_access.granted_by,
        created: user_access.created,
        updated: user_access.updated,
        property_name: properties.name,
        property_city: properties.city,
        property_country: properties.country,
        granted_by_name: granter.name,
        granted_by_email: granter.email,
      })
      .from(user_access)
      .innerJoin(properties, eq(user_access.property, properties.id))
      .innerJoin(granter, eq(user_access.granted_by, granter.id))
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
    data: { email: string; property: string; role: string },
    grantedBy: string,
  ) {
    const isOwner = await isPropertyOwner(data.property, grantedBy);
    if (!isOwner) {
      throw new ForbiddenException('Only property owners can grant access');
    }

    // Check if user exists
    const existingUser = await this.findUserByEmail(data.email);

    if (existingUser) {
      // User exists - check if they already have access
      const [existing] = await db
        .select()
        .from(user_access)
        .where(
          and(
            eq(user_access.property, data.property),
            eq(user_access.user, existingUser.id),
          ),
        )
        .limit(1);

      if (existing) {
        throw new BadRequestException('User already has access to this property');
      }

      // Grant immediate access
      const [access] = await db
        .insert(user_access)
        .values({
          user: existingUser.id,
          pending_email: null,
          property: data.property,
          role: data.role,
          granted_by: grantedBy,
        })
        .returning();

      return access;
    } else {
      // User doesn't exist - check for existing pending invitation
      const [existingPending] = await db
        .select()
        .from(user_access)
        .where(
          and(
            eq(user_access.property, data.property),
            eq(user_access.pending_email, data.email.toLowerCase()),
          ),
        )
        .limit(1);

      if (existingPending) {
        throw new BadRequestException(
          'A pending invitation already exists for this email. Please update or revoke the existing invitation.',
        );
      }

      // Create pending access
      const [access] = await db
        .insert(user_access)
        .values({
          user: null,
          pending_email: data.email.toLowerCase(),
          property: data.property,
          role: data.role,
          granted_by: grantedBy,
        })
        .returning();

      return access;
    }
  }

  async claimPendingAccess(userId: string): Promise<number> {
    // Get user's email
    const [currentUser] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!currentUser?.email) {
      return 0;
    }

    // Find all pending invitations for this email
    const pendingInvitations = await db
      .select()
      .from(user_access)
      .where(
        and(
          eq(user_access.pending_email, currentUser.email.toLowerCase()),
          isNull(user_access.user),
        ),
      );

    if (pendingInvitations.length === 0) {
      return 0;
    }

    // Activate each pending invitation
    for (const invitation of pendingInvitations) {
      await db
        .update(user_access)
        .set({
          user: userId,
          pending_email: null,
          updated: new Date(),
        })
        .where(eq(user_access.id, invitation.id));
    }

    return pendingInvitations.length;
  }

  async updateAccess(id: string, data: { role: string }, userId: string) {
    const [access] = await db
      .select()
      .from(user_access)
      .where(eq(user_access.id, id))
      .limit(1);

    if (!access) {
      throw new NotFoundException('Access record not found');
    }

    const isOwner = await isPropertyOwner(access.property, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only property owners can update access');
    }

    const [updated] = await db
      .update(user_access)
      .set({ role: data.role, updated: new Date() })
      .where(eq(user_access.id, id))
      .returning();

    return updated;
  }

  async revokeAccess(id: string, userId: string) {
    const [access] = await db
      .select()
      .from(user_access)
      .where(eq(user_access.id, id))
      .limit(1);

    if (!access) {
      throw new NotFoundException('Access record not found');
    }

    const isOwner = await isPropertyOwner(access.property, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only property owners can revoke access');
    }

    await db.delete(user_access).where(eq(user_access.id, id));
    return { success: true };
  }
}

