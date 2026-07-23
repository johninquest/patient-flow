import { Injectable } from '@nestjs/common';
import { db } from '../../core/db';
import { audit_log } from '../../core/db/schema';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class AuditService {
  /**
   * Record an audit log entry
   * This method is designed to never throw - audit logging should not break the main operation
   */
  async record(dto: CreateAuditLogDto): Promise<void> {
    try {
      await db.insert(audit_log).values({
        actor_user_id: dto.actor_user_id,
        actor_role: dto.actor_role,
        action: dto.action,
        resource_type: dto.resource_type,
        resource_id: dto.resource_id,
        diff: dto.diff || null,
        ip_address: dto.ip_address || null,
      });
    } catch (error) {
      // Log error but don't throw - audit failures should not break the main operation
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Calculate diff between old and new values for audit logging
   */
  calculateDiff(
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    fieldsToTrack: string[],
  ): Record<string, { from: any; to: any }> | null {
    const diff: Record<string, { from: any; to: any }> = {};
    let hasChanges = false;

    for (const field of fieldsToTrack) {
      const oldValue = oldValues[field];
      const newValue = newValues[field];

      if (oldValue !== newValue) {
        diff[field] = { from: oldValue, to: newValue };
        hasChanges = true;
      }
    }

    return hasChanges ? diff : null;
  }

  /**
   * Get audit logs for a specific resource
   */
  async findByResource(resourceType: string, resourceId: string) {
    return db
      .select()
      .from(audit_log)
      .where(
        eq(audit_log.resource_type, resourceType)
      )
      .orderBy(desc(audit_log.created_at));
  }

  /**
   * Get audit logs for a specific actor
   */
  async findByActor(actorUserId: string) {
    return db
      .select()
      .from(audit_log)
      .where(eq(audit_log.actor_user_id, actorUserId))
      .orderBy(desc(audit_log.created_at));
  }
}
