import { Injectable } from '@nestjs/common';
import { db } from '../db';
import { activities, properties } from '../db/schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { canAccessProperty } from '../common/access.util';

export interface ActivityLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, { from: any; to: any }> | null;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  property_id: string | null;
  created_at: Date;
}

export interface CreateActivityLogDto {
  entity_type: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete';
  changes?: Record<string, { from: any; to: any }>;
  user_id: string;
  user_name?: string;
  user_email?: string;
  property_id?: string;
}

export interface ActivityFilters {
  user_id?: string;
  action?: string;
  days?: number;
}

@Injectable()
export class ActivityService {
  /**
   * Create an activity log entry
   */
  async createLog(data: CreateActivityLogDto): Promise<void> {
    try {
      await db.insert(activities).values({
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        action: data.action,
        changes: data.changes || null,
        user_id: data.user_id,
        user_name: data.user_name || null,
        user_email: data.user_email || null,
        property_id: data.property_id || null,
      });
    } catch (error) {
      console.error('Failed to create activity log:', error);
      // Don't throw - activity logs should never break the main operation
    }
  }

  /**
   * Get activity feed for a property
   */
  async getPropertyActivityFeed(
    propertyId: string,
    userId: string,
    filters: ActivityFilters,
  ): Promise<ActivityLogEntry[]> {
    // Check access
    const hasAccess = await canAccessProperty(propertyId, userId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Build query conditions
    const conditions = [eq(activities.property_id, propertyId)];

    if (filters?.user_id) {
      conditions.push(eq(activities.user_id, filters.user_id));
    }

    if (filters?.action) {
      conditions.push(eq(activities.action, filters.action));
    }

    if (filters?.days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.days);
      conditions.push(gte(activities.created_at, cutoffDate));
    } else {
      // Default: last 30 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      conditions.push(gte(activities.created_at, cutoffDate));
    }

    const logs = await db
      .select()
      .from(activities)
      .where(and(...conditions))
      .orderBy(desc(activities.created_at))
      .limit(100); // Limit to 100 most recent

    // Cast changes to the correct type
    return logs.map(log => ({
      ...log,
      changes: log.changes as Record<string, { from: any; to: any }> | null
    }));
  }

  /**
   * Helper: Calculate what changed between two objects
   */
  calculateChanges(
    oldData: Record<string, any>,
    newData: Record<string, any>,
    significantFields?: string[],
  ): Record<string, { from: any; to: any }> | null {
    const changes: Record<string, { from: any; to: any }> = {};

    const fieldsToCheck = significantFields || Object.keys(newData);

    for (const field of fieldsToCheck) {
      if (oldData[field] !== newData[field]) {
        changes[field] = {
          from: oldData[field],
          to: newData[field],
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }
}