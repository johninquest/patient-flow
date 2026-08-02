---
applyTo: "apps/api/src/core/db/schema.ts"
description: "Drizzle ORM schema conventions for Patient Flow"
---

# Drizzle Schema Instructions

## Single Schema File

All table definitions live in `apps/api/src/core/db/schema.ts`. Do not split into multiple files.

## ID Convention

### Business entities — uuidv7

All application tables use `uuidv7()` for IDs. This provides time-sortable UUIDs.

```typescript
import { uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

id: uuid("id").primaryKey().default(sql`uuidv7()`),
```

**Never** use `gen_random_uuid()` — it produces random UUIDs that don't sort well.

### Auth tables — text IDs

Better Auth manages its own tables (`user`, `session`, `account`, `verification`) with `text("id")` primary keys. Do not change these.

## Table Naming

- **snake_case**, **plural**: `patients`, `encounters`, `tasks`, `audit_log`
- Column names: **snake_case**: `first_name`, `patient_id`, `created_at`

## Timestamps

Every business table includes `created_at` and `updated_at`:

```typescript
created_at: timestamp("created_at").defaultNow().notNull(),
updated_at: timestamp("updated_at").defaultNow().notNull(),
```

## Foreign Keys

Always specify `onDelete` behavior:

```typescript
// Cascade: delete children when parent is deleted
patient_id: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),

// Set null: keep the record but clear the reference
assigned_user_id: uuid("assigned_user_id").references(() => user.id, { onDelete: "set null" }),
```

## Indexes

Define indexes in the third argument of `pgTable()`:

```typescript
export const encounters = pgTable("encounters", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  patient_id: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  // ...
}, (table) => ({
  patientIdx: index("encounters_patient_idx").on(table.patient_id),
  statusIdx: index("encounters_status_idx").on(table.status),
}));
```

## Enums

Use plain `text` columns with application-level validation (not Postgres enum types). This makes migrations simpler and avoids the `ALTER TYPE` complexity.

```typescript
// In schema:
status: text("status").notNull(),  // 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled'

// In DTO:
@IsEnum(['scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled'])
status: string;
```

## JSONB Columns

Use `jsonb` for flexible structured data (audit diffs, metadata):

```typescript
diff: jsonb("diff"),  // { field: { from: value, to: value } }
```

## Optimistic Locking

Tables that need concurrency control include a `version` column:

```typescript
version: integer("version").default(0).notNull(),
```

Update with: `WHERE id = ? AND version = ?` then `SET version = version + 1`.

## Migration Workflow

1. Edit `apps/api/src/core/db/schema.ts`
2. Run `npm run db:generate` (from `apps/api/` directory)
3. Review the generated SQL in `drizzle/`
4. Run `npm run db:migrate`
5. **Never** edit files in `drizzle/` manually

## Database Connection

Connection setup in `apps/api/src/core/db/index.ts` uses `pg` Pool + `drizzle-orm/node-postgres`:

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

## Drizzle Config

`drizzle.config.ts` references `./src/core/db/schema.ts` (path relative to `apps/api/`):

```typescript
export default defineConfig({
  schema: "./src/core/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```
