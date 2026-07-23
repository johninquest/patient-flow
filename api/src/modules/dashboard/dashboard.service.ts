import { Injectable } from '@nestjs/common';
import { db } from '../../core/db';
import { patients, encounters, tasks } from '../../core/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

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
      .where(
        sql`${encounters.status} NOT IN ('completed', 'cancelled')`
      );

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
          lte(encounters.scheduled_time, tomorrow)
        )
      );

    return {
      totalPatients: Number(totalPatientsResult?.count || 0),
      activeEncounters: Number(activeEncountersResult?.count || 0),
      pendingTasks: Number(pendingTasksResult?.count || 0),
      todayEncounters: Number(todayEncountersResult?.count || 0),
    };
  }
}
