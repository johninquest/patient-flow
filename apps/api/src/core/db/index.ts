import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from the API's own .env file only.
config({ path: resolve(process.cwd(), '.env') });

/* console.log('=== ENV DEBUG ===');
console.log('__dirname:', __dirname);
console.log('Resolved .env path:', resolve(__dirname, '../../../.env'));
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'LOADED' : 'MISSING');
console.log('================='); */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection
pool
  .query('SELECT 1')
  .then(() => console.log('✓ Database connected'))
  .catch((err) => console.error('✗ Database connection failed:', err.message));

export const db = drizzle(pool, { schema });
export { pool };
