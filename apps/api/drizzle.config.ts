import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from the API's own .env file only.
dotenv.config({ path: ".env", override: true });

export default defineConfig({
  schema: "./src/core/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});