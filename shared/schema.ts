import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  isCouncil: boolean("is_council").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  isCouncil: true,
  isAdmin: true,
});

// Customer records schema (enhanced property units)
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  unitNumber: text("unit_number").notNull().unique(),
  floor: text("floor"),
  ownerName: text("owner_name").notNull(),
  ownerEmail: text("owner_email").notNull(),
  tenantName: text("tenant_name"),
  tenantEmail: text("tenant_email"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// For backward compatibility, property units now references customers
export const propertyUnits = pgTable("property_units", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  unitNumber: text("unit_number").notNull().unique(),
  floor: text("floor"),
  ownerName: text("owner_name").notNull(),
  ownerEmail: text("owner_email").notNull(),
  tenantName: text("tenant_name"),
  tenantEmail: text("tenant_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  unitNumber: true,
  floor: true,
  ownerName: true,
  ownerEmail: true,
  tenantName: true,
  tenantEmail: true,
  phone: true,
  notes: true,
});

export const insertPropertyUnitSchema = createInsertSchema(propertyUnits).pick({
  customerId: true,
  unitNumber: true,
  floor: true,
  ownerName: true,
  ownerEmail: true,
  tenantName: true,
  tenantEmail: true,
});

// Violation schema
export type ViolationStatus = "new" | "pending_approval" | "approved" | "disputed" | "rejected";

export const violations = pgTable("violations", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => propertyUnits.id),
  reportedById: integer("reported_by_id").notNull().references(() => users.id),
  violationType: text("violation_type").notNull(),
  violationDate: timestamp("violation_date").notNull(),
  violationTime: text("violation_time"),
  description: text("description").notNull(),
  bylawReference: text("bylaw_reference"),
  status: text("status").notNull().default("new"),
  fineAmount: integer("fine_amount"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  attachments: jsonb("attachments").$type<string[]>().default([]),
});

export const violationsRelations = relations(violations, ({ one }) => ({
  unit: one(propertyUnits, {
    fields: [violations.unitId],
    references: [propertyUnits.id],
  }),
  reportedBy: one(users, {
    fields: [violations.reportedById],
    references: [users.id],
  }),
}));

export const insertViolationSchema = createInsertSchema(violations).pick({
  unitId: true,
  reportedById: true,
  violationType: true,
  violationDate: true,
  violationTime: true,
  description: true,
  bylawReference: true,
  status: true,
  attachments: true,
});

// Violation history/comments schema
export const violationHistories = pgTable("violation_histories", {
  id: serial("id").primaryKey(),
  violationId: integer("violation_id").notNull().references(() => violations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const violationHistoriesRelations = relations(violationHistories, ({ one }) => ({
  violation: one(violations, {
    fields: [violationHistories.violationId],
    references: [violations.id],
  }),
  user: one(users, {
    fields: [violationHistories.userId],
    references: [users.id],
  }),
}));

export const insertViolationHistorySchema = createInsertSchema(violationHistories).pick({
  violationId: true,
  userId: true,
  action: true,
  comment: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type PropertyUnit = typeof propertyUnits.$inferSelect;
export type InsertPropertyUnit = z.infer<typeof insertPropertyUnitSchema>;
export type Violation = typeof violations.$inferSelect;
export type InsertViolation = z.infer<typeof insertViolationSchema>;
export type ViolationHistory = typeof violationHistories.$inferSelect;
export type InsertViolationHistory = z.infer<typeof insertViolationHistorySchema>;
