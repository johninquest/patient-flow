import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';

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
        // A new Google account must not be able to self-provision simply
        // because email/password signup is disabled.
        disableImplicitSignUp: true,
      },
    },
    // The admin plugin provides `auth.api.createUser`, which
    // UserService.createUser() uses to provision staff (user row + linked
    // `credential` account, password hashed by Better Auth).
    //
    // `defaultRole` is mandatory here: the plugin declares `user.role`
    // itself, so it *overrides* our `additionalFields.role` (default
    // included) and substitutes "user" for anyone created without an
    // explicit role. "user" is not one of our four roles, so CASL would
    // resolve it to an EMPTY ability and the account could do nothing.
    //
    // No `ac`/`roles` are passed on purpose. The plugin is used purely as a
    // provisioning API; authorization stays with CASL
    // (see core/auth/ability.ts) so there is exactly one permission model.
    plugins: [admin({ defaultRole: 'front_desk' })],
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
          defaultValue: 'front_desk',
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
