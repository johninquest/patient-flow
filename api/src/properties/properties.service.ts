import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db } from '../db';
import { properties, user, user_access } from '../db/schema';
import { eq, or, and } from 'drizzle-orm';
import { isPropertyOwner } from '../common/access.util';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class PropertiesService {
  constructor(private readonly activityService: ActivityService) {}

  async create(data: CreatePropertyDto, userId: string) {
    // Get user info
    const [currentUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const [property] = await db
      .insert(properties)
      .values({
        name: data.name,
        city: data.city,
        country: data.country,
        construction_year: data.construction_year || null,
        owner: userId,
      })
      .returning();

    // Create activity log
    await this.activityService.createLog({
      entity_type: 'property',
      entity_id: property.id,
      action: 'create',
      user_id: userId,
      user_name: currentUser?.name || undefined,
      user_email: currentUser?.email || undefined,
      property_id: property.id,
    });

    return property;
  }

  async findAll(userId: string) {
    // Get properties where user is owner OR has shared access
    const ownedProperties = await db
      .select()
      .from(properties)
      .where(eq(properties.owner, userId));

    const sharedProperties = await db
      .select({
        id: properties.id,
        name: properties.name,
        city: properties.city,
        country: properties.country,
        construction_year: properties.construction_year,
        owner: properties.owner,
        created: properties.created,
        updated: properties.updated,
      })
      .from(properties)
      .innerJoin(user_access, eq(properties.id, user_access.property))
      .where(eq(user_access.user, userId));

    // Combine and deduplicate
    const allProperties = [...ownedProperties];
    const ownedIds = new Set(ownedProperties.map(p => p.id));
    
    for (const prop of sharedProperties) {
      if (!ownedIds.has(prop.id)) {
        allProperties.push(prop);
      }
    }

    return allProperties;
  }

  async findOwned(userId: string) {
    // Keep this for cases where we only want owned properties
    return db.select().from(properties).where(eq(properties.owner, userId));
  }

  async findOne(id: string, userId: string) {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  async update(id: string, data: UpdatePropertyDto, userId: string) {
    const isOwner = await isPropertyOwner(id, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only property owners can update properties');
    }

    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Get user info
    const [currentUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // Calculate changes
    const changes = this.activityService.calculateChanges(
      property,
      data,
      ['name', 'city', 'country', 'construction_year'],
    );

    const [updated] = await db
      .update(properties)
      .set({
        ...data,
        updated: new Date(),
      })
      .where(eq(properties.id, id))
      .returning();

    // Create activity log only if there were significant changes
    if (changes) {
      await this.activityService.createLog({
        entity_type: 'property',
        entity_id: id,
        action: 'update',
        changes,
        user_id: userId,
        user_name: currentUser?.name || undefined,
        user_email: currentUser?.email || undefined,
        property_id: id,
      });
    }

    return updated;
  }

  async remove(id: string, userId: string) {
    const isOwner = await isPropertyOwner(id, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only property owners can delete properties');
    }

    // Get user info
    const [currentUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    await db.delete(properties).where(eq(properties.id, id));

    // Create activity log
    await this.activityService.createLog({
      entity_type: 'property',
      entity_id: id,
      action: 'delete',
      user_id: userId,
      user_name: currentUser?.name || undefined,
      user_email: currentUser?.email || undefined,
      property_id: id,
    });

    return { success: true };
  }
}