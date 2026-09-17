/** Removes throwaway data left by the HTTP verification script. */
import 'dotenv/config';
import { db } from '../core/db/index.js';
import { user, patients } from '../core/db/schema.js';
import { like, eq } from 'drizzle-orm';

async function main() {
  const removedUsers = await db
    .delete(user)
    .where(like(user.email, 'verify.%@example.test'))
    .returning({ id: user.id });
  const removedPatients = await db
    .delete(patients)
    .where(eq(patients.last_name, 'Verify'))
    .returning({ id: patients.id });

  console.log(
    `removed ${removedUsers.length} verification user(s), ${removedPatients.length} patient(s)`,
  );
  process.exit(0);
}

main();
