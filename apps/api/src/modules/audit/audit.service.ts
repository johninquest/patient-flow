import { Injectable } from '@nestjs/common';
import { db } from '../../core/db/index.js';
import { audit_log, user } from '../../core/db/schema.js';
import { CreateAuditLogDto } from './dto/create-audit-log.dto.js';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class AuditService {
  /**
   * Record an audit log entry.
   *
   * This method is designed to never throw — audit logging should not break the
   * main operation. That makes silent failure a standing risk, so the type of
   * every column matters (see ADR 0018): a wrong column type here fails at
   * insert and the failure is swallowed.
   *
   * `actor_name` is resolved here rather than at each call site so the snapshot
   * is always present and no service has to know about it.
   */
  async record(dto: CreateAuditLogDto): Promise<void> {
    try {
      const actorName = await this.resolveActorName(dto.actor_user_id);

      await db.insert(audit_log).values({
        actor_user_id: dto.actor_user_id,
        actor_name: actorName,
        actor_role: dto.actor_role,
        action: dto.action,
        resource_type: dto.resource_type,
        resource_id: dto.resource_id,
        patient_id: dto.patient_id ?? null,
        encounter_id: dto.encounter_id ?? null,
        diff: dto.diff || null,
        ip_address: dto.ip_address || null,
      });
    } catch (error) {
      // Log error but don't throw - audit failures should not break the main operation
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Snapshot the actor's display name for an audit entry.
   *
   * Falls back to the raw user id if the account cannot be read, which keeps the
   * entry attributable even when the name is unavailable. Never throws: this runs
   * inside `record()`, whose contract is that audit failures are non-fatal.
   */
  private async resolveActorName(userId: string): Promise<string | null> {
    try {
      const [actor] = await db
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      return actor?.name || actor?.email || null;
    } catch {
      return null;
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
   * Get audit logs for a specific resource instance.
   * Filters on BOTH resource type and resource ID — matching on type alone
   * would return every record of that type.
   */
  async findByResource(resourceType: string, resourceId: string) {
    return db
      .select()
      .from(audit_log)
      .where(
        and(
          eq(audit_log.resource_type, resourceType),
          eq(audit_log.resource_id, resourceId),
        ),
      )
      .orderBy(desc(audit_log.created_at));
  }

  /**
   * Get every audit entry concerning a patient: the patient's own events, all of
   * its encounters, and all tasks on those encounters.
   *
   * Reads the denormalized `patient_id` scope rather than `resource_type`,
   * because encounter and task rows name themselves as the target and carry no
   * reference to the patient.
   */
  async findByPatient(patientId: string) {
    return db
      .select()
      .from(audit_log)
      .where(eq(audit_log.patient_id, patientId))
      .orderBy(desc(audit_log.created_at));
  }

  /**
   * Get every audit entry concerning an encounter: its own events plus every
   * task event on it.
   */
  async findByEncounter(encounterId: string) {
    return db
      .select()
      .from(audit_log)
      .where(eq(audit_log.encounter_id, encounterId))
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

  /**
   * Get every audit log of a given resource type, newest first.
   *
   * Backs the admin-only staff Activity tab, which lists all
   * `resource_type = 'user'` events (provisioning, registration, role and
   * status changes, admin seeding) regardless of the specific user.
   */
  async findByResourceType(resourceType: string) {
    return db
      .select()
      .from(audit_log)
      .where(eq(audit_log.resource_type, resourceType))
      .orderBy(desc(audit_log.created_at));
  }
}
