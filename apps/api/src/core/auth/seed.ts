import { db } from '../db';
import { user, audit_log } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Seed the admin user from the ADMIN_EMAIL environment variable.
 *
 * - If ADMIN_EMAIL is not set, this is a no-op.
 * - If the user exists and is not already admin, promote them.
 * - If the user does not exist yet, log a warning (they need to register first).
 * - Idempotent: safe to call on every startup.
 */
export async function seedAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();

  if (!adminEmail) {
    console.log('[seed] ADMIN_EMAIL not set — skipping admin seed.');
    return;
  }

  try {
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);

    if (!existingUser) {
      console.warn(
        `[seed] ADMIN_EMAIL "${adminEmail}" not found in user table. ` +
          `Register this user first, then restart the app to promote them to admin.`,
      );
      return;
    }

    if (existingUser.role === 'admin') {
      console.log(
        `[seed] User "${adminEmail}" is already admin — no changes needed.`,
      );
      return;
    }

    const previousRole = existingUser.role;

    await db
      .update(user)
      .set({ role: 'admin', updatedAt: new Date() })
      .where(eq(user.id, existingUser.id));

    // Record the promotion in the audit log
    await db.insert(audit_log).values({
      actor_user_id: existingUser.id,
      actor_role: previousRole,
      action: 'admin.seeded',
      resource_type: 'user',
      resource_id: existingUser.id,
      diff: { role: { from: previousRole, to: 'admin' } },
    });

    console.log(
      `[seed] User "${adminEmail}" promoted from "${previousRole}" to "admin".`,
    );
  } catch (error) {
    console.error('[seed] Failed to seed admin user:', error);
  }
}
