/**
 * Bootstrap script: create the first administrator.
 *
 * Why this exists:
 * - Public self-signup is disabled (`emailAndPassword.disableSignUp`) so that
 *   nobody can self-provision an account.
 * - `seedAdmin()` can only *promote* a user that already exists — it cannot
 *   create one.
 *
 * This script is therefore the only supported way to create the very first
 * account. It refuses to run once an active admin exists, so it cannot be used
 * to mint extra admins after bootstrap — provision staff through
 * `POST /api/users` and change roles through `PATCH /api/users/:id`.
 *
 * Usage:
 *   pnpm run db:create-admin -- --email admin@clinic.example --name "Clinic Admin"
 *
 * Options:
 *   --email <address>    Required. Email address of the administrator.
 *   --name <full name>   Required. Display name.
 *   --password <value>   Optional. Prompted for (hidden) when omitted — prefer
 *                        this, since `--password` lands in your shell history.
 */

import { and, eq, sql } from 'drizzle-orm';
import { db, pool } from '../core/db/index.js';
import { user } from '../core/db/schema.js';
import { AuditService } from '../modules/audit/audit.service.js';
import { getAuth } from '../core/auth/auth.js';

interface Options {
  email: string;
  name: string;
  password?: string;
}

function parseArgs(argv: string[]): Options {
  const values = new Map<string, string>();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    values.set(key, next);
    i += 1;
  }

  const email = values.get('email')?.trim();
  const name = values.get('name')?.trim();
  const password = values.get('password');

  if (!email) throw new Error('--email is required');
  if (!name) throw new Error('--name is required');

  return { email, name, password };
}

/**
 * Read a value from the terminal without echoing it.
 */
async function promptHidden(prompt: string): Promise<string> {
  const stdin = process.stdin;

  // Piping input in would defeat the point of hiding it, and raw mode is not
  // available. Fail loudly rather than silently reading an empty password.
  if (!stdin.isTTY) {
    throw new Error(
      'Cannot prompt for a password without an interactive terminal. Pass --password instead.',
    );
  }

  process.stdout.write(prompt);

  return new Promise<string>((resolve) => {
    let value = '';

    function finish(): void {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off('data', onData);
    }

    function onData(chunk: Buffer): void {
      for (const char of chunk.toString('utf8')) {
        if (char === '\r' || char === '\n' || char === '\u0004') {
          finish();
          process.stdout.write('\n');
          resolve(value);
          return;
        }

        if (char === '\u0003') {
          // Ctrl+C. Restore the terminal before exiting, otherwise the shell is
          // left in raw mode with no echo.
          finish();
          process.stdout.write('\n');
          process.exit(130);
        }

        if (char === '\u007f' || char === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }

        // Ignore remaining control characters and escape sequences.
        if (char < ' ') continue;

        value += char;
        process.stdout.write('*');
      }
    }

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function countActiveAdmins(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(and(eq(user.role, 'admin'), eq(user.status, 'active')));

  return row?.count ?? 0;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const existingAdmins = await countActiveAdmins();
  if (existingAdmins > 0) {
    throw new Error(
      `An active admin already exists (${existingAdmins}). This script only ` +
        `bootstraps the first one — create staff via POST /api/users and change ` +
        `roles via PATCH /api/users/:id.`,
    );
  }

  const [byEmail] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, options.email))
    .limit(1);

  if (byEmail) {
    throw new Error(
      `A user with email "${options.email}" already exists. Promote them with ` +
        `PATCH /api/users/${byEmail.id} instead.`,
    );
  }

  const password = options.password ?? (await promptHidden('Password: '));
  if (!password) {
    throw new Error('Password cannot be empty');
  }

  // Same call the admin API uses, so the password is hashed and stored on a
  // linked `credential` account by Better Auth. `role` is passed through `data`
  // because the plugin types its top-level `role` param as its own built-in
  // vocabulary ("user" | "admin"), which excludes "admin"'s siblings here.
  //
  // The plugin's create hook is deliberately skipped: it would overwrite `role`
  // with `defaultRole`, and it cannot write to our audit log.
  const created = await getAuth().api.createUser({
    body: {
      name: options.name,
      email: options.email,
      password,
      data: { role: 'admin' },
    },
  });

  const userId: string = created.user.id;

  // Created out-of-band rather than through an email link, so mark the address
  // verified. Otherwise this account would be locked out if
  // `requireEmailVerification` is ever enabled.
  await db
    .update(user)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(user.id, userId));

  // Routed through AuditService so the entry gets the same actor_name snapshot
  // and scope columns as every other audit entry.
  await new AuditService().record({
    actor_user_id: userId,
    actor_role: 'admin',
    action: 'admin.bootstrapped',
    resource_type: 'user',
    resource_id: userId,
    diff: { role: { from: null, to: 'admin' } },
  });

  console.log(`✓ Created admin "${options.email}" (${userId}).`);
  console.log('  Sign in at /login to continue.');
}

main()
  .catch((error: unknown) => {
    console.error(
      `✗ ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
