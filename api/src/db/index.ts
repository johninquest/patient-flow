import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { config } from "dotenv";

// Load environment variables
config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection
pool.query("SELECT 1")
  .then(() => console.log("✓ Database connected"))
  .catch((err) => console.error("✗ Database connection failed:", err.message));

export const db = drizzle(pool, { schema });
export { pool };