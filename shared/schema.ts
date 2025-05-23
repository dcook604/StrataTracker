import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
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
  lockReason: text("lock_reason"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  forcePasswordChange: boolean("force_password_change").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Add type augmentation for snake_case compatibility
export type User = typeof users.$inferSelect & {
  is_admin?: boolean;
  is_council_member?: boolean;
  is_user?: boolean;
};

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
  // ownerName, ownerEmail, tenantName, tenantEmail are deprecated and will be removed.
  // Use the persons and unitPersonRoles tables instead.
  ownerName: text("owner_name"), // Deprecated
  ownerEmail: text("owner_email"), // Deprecated
  tenantName: text("tenant_name"), // Deprecated
  tenantEmail: text("tenant_email"), // Deprecated
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
  unitNumber: true,
  floor: true,
  // Deprecated fields are not included in insert schema for new units
});
export type PropertyUnit = typeof propertyUnits.$inferSelect;
export type InsertPropertyUnit = typeof propertyUnits.$inferInsert;

// UnitFacilities table
export const unitFacilities = pgTable("unit_facilities", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => propertyUnits.id, { onDelete: 'cascade' }).unique(), // Ensure one-to-one
  parkingSpots: integer("parking_spots").default(0),
  storageLockers: integer("storage_lockers").default(0),
  bikeLockers: integer("bike_lockers").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUnitFacilitySchema = createInsertSchema(unitFacilities);
export type UnitFacility = typeof unitFacilities.$inferSelect;
export type InsertUnitFacility = typeof unitFacilities.$inferInsert;

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
  status: text("status").notNull().default("pending_approval"),
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
  commenterName: text("commenter_name"),
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
  commenterName: true,
});

// Types
// Define relationships for property units
export const propertyUnitsRelations = relations(propertyUnits, ({ one, many }) => ({
  customer: one(customers, {
    fields: [propertyUnits.customerId],
    references: [customers.id],
  }),
  unitRoles: many(unitPersonRoles),
  facilities: one(unitFacilities, {
    fields: [propertyUnits.id],
    references: [unitFacilities.unitId],
  })
}));

// Define relationships for system settings
export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedBy: one(users, {
    fields: [systemSettings.updatedById],
    references: [users.id],
  }),
}));

// Persons table (for owners/tenants)
export const persons = pgTable("persons", {
  id: serial("id").primaryKey(),
  // TODO: Add unique constraints back after data migration for existing records
  authUserId: text("auth_user_id"), // Link to Supabase Auth User ID for system users
  fullName: text("full_name").notNull(),
  // TODO: Add unique constraints back after data migration for existing records
  email: text("email").notNull(),
  phone: text("phone"),
  isSystemUser: boolean("is_system_user").default(false).notNull(), // True if this person can log in
  // Pet information
  hasCat: boolean("has_cat").default(false),
  hasDog: boolean("has_dog").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPersonSchema = createInsertSchema(persons).pick({
  fullName: true,
  email: true,
  phone: true,
  // Add pet info to insert schema
  hasCat: true,
  hasDog: true,
});

// Unit-Person Roles (many-to-many, with role: 'owner' | 'tenant')
export const unitPersonRoles = pgTable("unit_person_roles", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => propertyUnits.id),
  personId: integer("person_id").notNull().references(() => persons.id),
  role: text("role").notNull(), // 'owner' or 'tenant'
  receiveEmailNotifications: boolean("receive_email_notifications").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUnitPersonRoleSchema = createInsertSchema(unitPersonRoles).pick({
  unitId: true,
  personId: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type ViolationCategory = typeof violationCategories.$inferSelect;
export type InsertViolationCategory = z.infer<typeof insertViolationCategorySchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type Violation = typeof violations.$inferSelect;
export type InsertViolation = z.infer<typeof insertViolationSchema>;
export type ViolationHistory = typeof violationHistories.$inferSelect;
export type InsertViolationHistory = z.infer<typeof insertViolationHistorySchema>;
export type Person = typeof persons.$inferSelect;
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type UnitPersonRole = typeof unitPersonRoles.$inferSelect;
export type InsertUnitPersonRole = z.infer<typeof insertUnitPersonRoleSchema>;

// Violation access links schema (for secure public comment/evidence links)
export const violationAccessLinks = pgTable("violation_access_links", {
  id: serial("id").primaryKey(),
  violationId: integer("violation_id").notNull().references(() => violations.id),
  recipientEmail: text("recipient_email").notNull(),
  token: uuid("token").defaultRandom().notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertViolationAccessLinkSchema = createInsertSchema(violationAccessLinks).pick({
  violationId: true,
  recipientEmail: true,
  token: true,
  expiresAt: true,
  usedAt: true,
});

export type ViolationAccessLink = typeof violationAccessLinks.$inferSelect;
export type InsertViolationAccessLink = z.infer<typeof insertViolationAccessLinkSchema>;

// Define relationships for persons
export const personsRelations = relations(persons, ({ many }) => ({
  unitRoles: many(unitPersonRoles),
}));

// Define relationships for unitPersonRoles
export const unitPersonRolesRelations = relations(unitPersonRoles, ({ one }) => ({
  propertyUnit: one(propertyUnits, {
    fields: [unitPersonRoles.unitId],
    references: [propertyUnits.id],
  }),
  person: one(persons, {
    fields: [unitPersonRoles.personId],
    references: [persons.id],
  }),
}));

// Define relationships for unitFacilities
export const unitFacilitiesRelations = relations(unitFacilities, ({ one }) => ({
  propertyUnit: one(propertyUnits, {
    fields: [unitFacilities.unitId],
    references: [propertyUnits.id],
  }),
}));

