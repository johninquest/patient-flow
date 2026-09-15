import { Injectable } from '@nestjs/common';
import { db } from '../../core/db/index.js';
import { patients, encounters, tasks, user } from '../../core/db/schema.js';
import { eq, and, gte, lte, sql, inArray, or } from 'drizzle-orm';

/** Statuses considered "still in the clinic" for the flow board. */
const ACTIVE_STATUSES = ['scheduled', 'checked_in', 'in_progress'];

@Injectable()
export class DashboardService {
  async getStats() {
    // Total patients
    const [totalPatientsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients);

    // Active encounters (not completed or cancelled)
    const [activeEncountersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(encounters)
      .where(sql`${encounters.status} NOT IN ('completed', 'cancelled')`);

    // Pending tasks (not done)
    const [pendingTasksResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(eq(tasks.status, 'todo'));

    // Today's encounters
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayEncountersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(encounters)
      .where(
        and(
          gte(encounters.scheduled_time, today),
          lte(encounters.scheduled_time, tomorrow),
        ),
      );

    return {
      totalPatients: Number(totalPatientsResult?.count || 0),
      activeEncounters: Number(activeEncountersResult?.count || 0),
      pendingTasks: Number(pendingTasksResult?.count || 0),
      todayEncounters: Number(todayEncountersResult?.count || 0),
    };
  }

  /**
   * Patient flow board: "where is every patient right now?".
   *
   * Returns every encounter that is still active, plus encounters completed
   * today (so staff can see what just finished). Task counts are aggregated in
   * a single grouped query to avoid an N+1 per encounter.
   */
  async getFlow() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = await db
      .select({
        id: encounters.id,
        patient_id: encounters.patient_id,
        patient_name: sql<string>`${patients.first_name} || ' ' || ${patients.last_name}`,
        status: encounters.status,
        phase: encounters.phase,
        assigned_to: encounters.assigned_to,
        assigned_to_name: user.name,
        scheduled_time: encounters.scheduled_time,
        updated_at: encounters.updated_at,
      })
      .from(encounters)
      .leftJoin(patients, eq(encounters.patient_id, patients.id))
      .leftJoin(user, eq(encounters.assigned_to, user.id))
      .where(
        or(
          inArray(encounters.status, ACTIVE_STATUSES),
          and(
            eq(encounters.status, 'completed'),
            gte(encounters.updated_at, today),
          ),
        ),
      )
      .orderBy(
        encounters.status,
        sql`${encounters.scheduled_time} ASC NULLS LAST`,
      );

    if (rows.length === 0) return [];

    // Aggregate task counts for all returned encounters in one round trip.
    const counts = await db
      .select({
        encounter_id: tasks.encounter_id,
        task_count: sql<number>`count(*)`,
        task_done_count: sql<number>`count(*) FILTER (WHERE ${tasks.status} = 'done')`,
        task_blocking_open_count: sql<number>`count(*) FILTER (WHERE ${tasks.blocking} = true AND ${tasks.status} <> 'done')`,
      })
      .from(tasks)
      .where(
        inArray(
          tasks.encounter_id,
          rows.map((row) => row.id),
        ),
      )
      .groupBy(tasks.encounter_id);

    const countsByEncounter = new Map(counts.map((c) => [c.encounter_id, c]));

    return rows.map((row) => {
      const c = countsByEncounter.get(row.id);
      return {
        ...row,
        task_count: Number(c?.task_count || 0),
        task_done_count: Number(c?.task_done_count || 0),
        task_blocking_open_count: Number(c?.task_blocking_open_count || 0),
      };
    });
  }
}
