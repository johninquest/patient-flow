import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { audit_log } from '../db/schema.js';
import { PENDING_ROLE } from './roles.js';

/**
 * Builds the Better Auth instance.
 *
 * Kept as a separate function so its return type is *inferred* — including the
 * endpoints contributed by configured plugins. Annotating the instance (or
 * returning `any`) would erase that, and a call to an endpoint the plugins do
 * not provide (e.g. `auth.api.createUser` without the admin plugin) would then
 * compile silently and fail at runtime as a 500.
 */
function createAuth() {
  const allowedOrigins = process.env.CLIENT_URL?.split(',').map((url) =>
    url.trim(),
  ) || ['http://localhost:5173'];
  const isProduction = process.env.NODE_ENV === 'production';

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret: process.env.AUTH_SECRET,
    baseURL: process.env.API_URL || 'http://localhost:3000',
    basePath: '/api/auth',
    emailAndPassword: {
      enabled: true,
      // Public self-signup is closed. Staff accounts are provisioned by an
      // admin via `POST /api/users`; the very first admin is created with
      // `pnpm run db:create-admin`.
      disableSignUp: true,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        // Implicit sign-up is intentionally ENABLED so staff can self-register
        // with their Google account instead of waiting for an admin to create
        // the account for them. This does not grant access: a brand-new user
        // lands on `pending` (see `defaultRole` below) and can reach nothing
        // until an admin assigns a role via `PATCH /api/users/:id`.
        //
        // To restrict signup to a Google Workspace domain, uncomment:
        //   hd: process.env.GOOGLE_WORKSPACE_DOMAIN,
        // Better Auth enforces the `hd` claim on the returned ID token, so
        // accounts outside that domain are rejected before a user is created.
        // Leave it unset to accept any Google account.
      },
    },
    // The admin plugin provides `auth.api.createUser`, which
    // UserService.createUser() uses to provision staff (user row + linked
    // `credential` account, password hashed by Better Auth).
    //
    // `defaultRole` is mandatory here: the plugin declares `user.role`
    // itself, so it *overrides* our `additionalFields.role` (default
    // included) and substitutes "user" for anyone created without an
    // explicit role. "user" is not one of our roles at all, so CASL would
    // resolve it to an EMPTY ability — fine for a pending user by luck, but
    // wrong in kind. `pending` is the deliberate zero-access default: a new
    // Google signup can authenticate but reach nothing until granted a role.
    //
    // No `ac`/`roles` are passed on purpose. The plugin is used purely as a
    // provisioning API; authorization stays with CASL
    // (see core/auth/ability.ts) so there is exactly one permission model.
    plugins: [admin({ defaultRole: PENDING_ROLE })],
    databaseHooks: {
      user: {
        create: {
          // Self-service Google signup bypasses every service, so this hook is
          // the only place that observes it. An admin later sees the entry in
          // the staff activity log — useful context when deciding whether to
          // grant access to an unfamiliar account.
          //
          // This hook fires for *every* user creation, including
          // `auth.api.createUser` (admin provisioning) and the bootstrap
          // script. Those paths already write their own `user.created` /
          // `admin.bootstrapped` entries, so writing `user.registered` for them
          // too would double-log and mislabel an admin action as a
          // self-registration. Only a user left on `pending` actually
          // self-registered: every other path sets a role explicitly.
          after: async (createdUser) => {
            if (createdUser.role !== PENDING_ROLE) return;

            try {
              await db.insert(audit_log).values({
                actor_user_id: createdUser.id,
                actor_role: PENDING_ROLE,
                action: 'user.registered',
                resource_type: 'user',
                resource_id: createdUser.id,
                diff: {
                  email: { from: null, to: createdUser.email },
                  name: { from: null, to: createdUser.name ?? null },
                  role: { from: null, to: PENDING_ROLE },
                },
              });
            } catch (error) {
              // Never fail registration over an audit write — same policy as
              // AuditService.record().
              console.error('[auth] Failed to audit user registration:', error);
            }
          },
        },
      },
    },
    trustedOrigins: allowedOrigins,
    advanced: {
      // Only enable cross-subdomain cookies in production
      ...(isProduction && {
        crossSubDomainCookies: {
          enabled: true,
          domain: '.popaty.com',
        },
      }),
      defaultCookieAttributes: {
        sameSite: 'lax',
        secure: isProduction, // ✅ false for localhost (HTTP), true for production (HTTPS)
        httpOnly: true,
      },
    },
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: true,
          // Mirrors the column default in core/db/schema.ts. The admin plugin's
          // `defaultRole` actually wins for plugin-created users, but both must
          // agree so the zero-access default holds whichever path creates the row.
          defaultValue: PENDING_ROLE,
          // Server-owned. Without this, `role` is writable through the
          // generic input routes, letting a caller self-assign `admin`.
          input: false,
        },
        title: {
          type: 'string',
          required: false,
        },
        status: {
          type: 'string',
          required: true,
          defaultValue: 'active',
          // Server-owned, for the same reason as `role`.
          input: false,
        },
      },
    },
  });
}

let authInstance: ReturnType<typeof createAuth> | null = null;

/**
 * Retrieves or initializes the authentication instance using better-auth library.
 * Uses Drizzle ORM with PostgreSQL.
 */
export function getAuth(): ReturnType<typeof createAuth> {
  authInstance ??= createAuth();
  return authInstance;
}
