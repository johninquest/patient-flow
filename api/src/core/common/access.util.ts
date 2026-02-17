import { db } from '../db';
import { properties, user_access } from '../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Check if user can access a property (owner or has any shared access)
 */
export async function canAccessProperty(
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
      and(eq(user_access.property, propertyId), eq(user_access.user, userId)),
    )
    .limit(1);

  return !!access;
}

/**
 * Check if user can edit a property (owner or manager)
 */
export async function canEditProperty(
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

/**
 * Check if user owns a property (for delete operations)
 */
export async function isPropertyOwner(
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