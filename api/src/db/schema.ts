import { pgTable, text, timestamp, boolean, integer, decimal, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  name: text("name").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  construction_year: integer("construction_year"),
  owner: text("owner").notNull().references(() => user.id, { onDelete: "cascade" }),
  created: timestamp("created").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow().notNull(),
});

export const units = pgTable("units", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  unit_name: text("unit_name"),
  unit_number: text("unit_number").notNull(),
  property: uuid("property").notNull().references(() => properties.id, { onDelete: "cascade" }),
  created: timestamp("created").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow().notNull(),
});

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  preferred_name: text("preferred_name"),
  id_card_number: text("id_card_number"),
  phone: text("phone").notNull(),
  property: uuid("property").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unit: uuid("unit").references(() => units.id, { onDelete: "set null" }),
  active: boolean("active").default(true).notNull(),
  created: timestamp("created").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow().notNull(),
});

export const rent_entries = pgTable("rent_entries", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  tenant: uuid("tenant").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  payment_date: timestamp("payment_date").notNull(),
  rent_month: text("rent_month").notNull(), // Format: "YYYY-MM"
  notes: text("notes"),
  recorded_by: text("recorded_by").notNull().references(() => user.id),
  created: timestamp("created").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  property: uuid("property").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unit: uuid("unit").references(() => units.id, { onDelete: "set null" }),
  category: text("category").notNull(), // 'maintenance', 'utilities', etc.
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  expense_date: timestamp("expense_date").notNull(),
  vendor: text("vendor"),
  recorded_by: text("recorded_by").notNull().references(() => user.id),
  created: timestamp("created").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow().notNull(),
});

export const user_access = pgTable("user_access", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  user: text("user").notNull().references(() => user.id, { onDelete: "cascade" }),
  property: uuid("property").notNull().references(() => properties.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'manager' | 'viewer'
  granted_by: text("granted_by").notNull().references(() => user.id),
  created: timestamp("created").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow().notNull(),
});