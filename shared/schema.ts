import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  isCouncilMember: boolean("is_council_member").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isUser: boolean("is_user").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  accountLocked: boolean("account_locked").default(false),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  forcePasswordChange: boolean("force_password_change").default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
  fullName: true,
  isCouncilMember: true,
  isAdmin: true,
  isUser: true,
  forcePasswordChange: true,
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

// Violation categories schema
export const violationCategories = pgTable("violation_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  bylawReference: text("bylaw_reference"),
  defaultFineAmount: integer("default_fine_amount"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertViolationCategorySchema = createInsertSchema(violationCategories).pick({
  name: true,
  description: true,
  bylawReference: true,
  defaultFineAmount: true,
  active: true,
});

// System settings schema (for global email settings, etc.)
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedById: integer("updated_by_id").references(() => users.id),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).pick({
  settingKey: true,
  settingValue: true,
  description: true,
  updatedById: true,
});

// Violation schema
export type ViolationStatus = "new" | "pending_approval" | "approved" | "disputed" | "rejected";

export const violations = pgTable("violations", {
  id: serial("id").primaryKey(),
  referenceNumber: uuid("reference_number").defaultRandom().notNull().unique(),
  unitId: integer("unit_id").notNull().references(() => propertyUnits.id),
  reportedById: integer("reported_by_id").notNull().references(() => users.id),
  categoryId: integer("category_id").references(() => violationCategories.id),
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
  pdfGenerated: boolean("pdf_generated").default(false),
  pdfPath: text("pdf_path"),
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
  category: one(violationCategories, {
    fields: [violations.categoryId],
    references: [violationCategories.id],
  }),
}));

export const insertViolationSchema = createInsertSchema(violations).pick({
  unitId: true,
  reportedById: true,
  categoryId: true,
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
// Define relationships for property units
export const propertyUnitsRelations = relations(propertyUnits, ({ one }) => ({
  customer: one(customers, {
    fields: [propertyUnits.customerId],
    references: [customers.id],
  }),
}));

// Define relationships for system settings
export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedBy: one(users, {
    fields: [systemSettings.updatedById],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type PropertyUnit = typeof propertyUnits.$inferSelect;
export type InsertPropertyUnit = z.infer<typeof insertPropertyUnitSchema>;
export type ViolationCategory = typeof violationCategories.$inferSelect;
export type InsertViolationCategory = z.infer<typeof insertViolationCategorySchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type Violation = typeof violations.$inferSelect;
export type InsertViolation = z.infer<typeof insertViolationSchema>;
export type ViolationHistory = typeof violationHistories.$inferSelect;
export type InsertViolationHistory = z.infer<typeof insertViolationHistorySchema>;
