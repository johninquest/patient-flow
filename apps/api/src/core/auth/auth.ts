import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';

let authInstance: any = null;

/**
 * Retrieves or initializes the authentication instance using better-auth library.
 * Uses Drizzle ORM with PostgreSQL.
 */

export function getAuth(): any {
  if (!authInstance) {
    const allowedOrigins = process.env.CLIENT_URL?.split(',').map((url) =>
      url.trim(),
    ) || ['http://localhost:5173'];
    const isProduction = process.env.NODE_ENV === 'production';

    /* console.log('=== Better Auth Configuration ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('isProduction:', isProduction);
    console.log('CLIENT_URL env variable:', process.env.CLIENT_URL);
    console.log('Trusted origins:', allowedOrigins);
    console.log('================================='); */

    authInstance = betterAuth({
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
        disableSignUp: false, // TEMPORARILY enabled for initial admin bootstrap
      },
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
            defaultValue: 'front_desk',
          },
          title: {
            type: 'string',
            required: false,
          },
          status: {
            type: 'string',
            required: true,
            defaultValue: 'active',
          },
        },
      },
    });
  }
  return authInstance;
}
