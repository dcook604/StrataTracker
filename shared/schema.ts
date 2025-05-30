import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { unique } from "drizzle-orm/pg-core";
import crypto from "crypto";

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
  strataLot: text("strata_lot"),
  floor: text("floor"),
  // Mailing address fields
  mailingStreet1: text("mailing_street1"),
  mailingStreet2: text("mailing_street2"),
  mailingCity: text("mailing_city"),
  mailingStateProvince: text("mailing_state_province"),
  mailingPostalCode: text("mailing_postal_code"),
  mailingCountry: text("mailing_country"),
  // Contact and notes
  phone: text("phone"),
  notes: text("notes"),
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
  strataLot: true,
  floor: true,
  mailingStreet1: true,
  mailingStreet2: true,
  mailingCity: true,
  mailingStateProvince: true,
  mailingPostalCode: true,
  mailingCountry: true,
  phone: true,
  notes: true,
  // Deprecated fields are not included in insert schema for new units
});
export type PropertyUnit = typeof propertyUnits.$inferSelect;
export type InsertPropertyUnit = typeof propertyUnits.$inferInsert;

// Parking spots table
export const parkingSpots = pgTable("parking_spots", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => propertyUnits.id, { onDelete: 'cascade' }),
  identifier: text("identifier").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertParkingSpotSchema = createInsertSchema(parkingSpots).pick({
  unitId: true,
  identifier: true,
});
export type ParkingSpot = typeof parkingSpots.$inferSelect;
export type InsertParkingSpot = typeof parkingSpots.$inferInsert;

// Storage lockers table
export const storageLockers = pgTable("storage_lockers", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => propertyUnits.id, { onDelete: 'cascade' }),
  identifier: text("identifier").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStorageLockerSchema = createInsertSchema(storageLockers).pick({
  unitId: true,
  identifier: true,
});
export type StorageLocker = typeof storageLockers.$inferSelect;
export type InsertStorageLocker = typeof storageLockers.$inferInsert;

// Bike lockers table
export const bikeLockers = pgTable("bike_lockers", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => propertyUnits.id, { onDelete: 'cascade' }),
  identifier: text("identifier").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBikeLockerSchema = createInsertSchema(bikeLockers).pick({
  unitId: true,
  identifier: true,
});
export type BikeLocker = typeof bikeLockers.$inferSelect;
export type InsertBikeLocker = typeof bikeLockers.$inferInsert;

// DEPRECATED: Old UnitFacilities table - to be removed after migration
export const unitFacilities = pgTable("unit_facilities", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => propertyUnits.id, { onDelete: 'cascade' }).unique(), // Ensure one-to-one
  parkingSpots: text("parking_spots"),
  storageLockers: text("storage_lockers"),
  bikeLockers: text("bike_lockers"),
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
  uuid: uuid("uuid").notNull().unique().$defaultFn(() => crypto.randomUUID()),
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
  violationUuid: uuid("violation_uuid").references(() => violations.uuid),
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
  // New facility relations
  parkingSpots: many(parkingSpots),
  storageLockers: many(storageLockers),
  bikeLockers: many(bikeLockers),
  // Deprecated - will be removed
  facilities: one(unitFacilities, {
    fields: [propertyUnits.id],
    references: [unitFacilities.unitId],
  })
}));

// Define relationships for parking spots
export const parkingSpotsRelations = relations(parkingSpots, ({ one }) => ({
  propertyUnit: one(propertyUnits, {
    fields: [parkingSpots.unitId],
    references: [propertyUnits.id],
  }),
}));

// Define relationships for storage lockers
export const storageLockersRelations = relations(storageLockers, ({ one }) => ({
  propertyUnit: one(propertyUnits, {
    fields: [storageLockers.unitId],
    references: [propertyUnits.id],
  }),
}));

// Define relationships for bike lockers
export const bikeLockersRelations = relations(bikeLockers, ({ one }) => ({
  propertyUnit: one(propertyUnits, {
    fields: [bikeLockers.unitId],
    references: [propertyUnits.id],
  }),
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
  violationUuid: uuid("violation_uuid").references(() => violations.uuid), // Optional for backward compatibility
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

// Communications Schema
export const communicationCampaigns = pgTable("communication_campaigns", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'newsletter', 'announcement', 'update', 'emergency'
  status: text("status").default("draft").notNull(), // 'draft', 'scheduled', 'sending', 'sent', 'failed'
  subject: text("subject").notNull(),
  content: text("content").notNull(), // HTML content
  plainTextContent: text("plain_text_content"), // Plain text version
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const communicationRecipients = pgTable("communication_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => communicationCampaigns.id, { onDelete: 'cascade' }),
  recipientType: text("recipient_type").notNull(), // 'all', 'owners', 'tenants', 'units', 'individual', 'manual'
  unitId: integer("unit_id").references(() => propertyUnits.id),
  personId: integer("person_id").references(() => persons.id),
  email: text("email").notNull(),
  recipientName: text("recipient_name").notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'sent', 'failed', 'bounced'
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  trackingId: text("tracking_id").unique(), // Unique tracking ID for this recipient
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communicationTemplates = pgTable("communication_templates", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'newsletter', 'announcement', 'update', 'emergency'
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const communicationCampaignsRelations = relations(communicationCampaigns, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [communicationCampaigns.createdById],
    references: [users.id],
  }),
  recipients: many(communicationRecipients),
}));

export const communicationRecipientsRelations = relations(communicationRecipients, ({ one }) => ({
  campaign: one(communicationCampaigns, {
    fields: [communicationRecipients.campaignId],
    references: [communicationCampaigns.id],
  }),
  unit: one(propertyUnits, {
    fields: [communicationRecipients.unitId],
    references: [propertyUnits.id],
  }),
  person: one(persons, {
    fields: [communicationRecipients.personId],
    references: [persons.id],
  }),
}));

export const communicationTemplatesRelations = relations(communicationTemplates, ({ one }) => ({
  createdBy: one(users, {
    fields: [communicationTemplates.createdById],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertCommunicationCampaignSchema = createInsertSchema(communicationCampaigns).pick({
  title: true,
  type: true,
  subject: true,
  content: true,
  plainTextContent: true,
  scheduledAt: true,
});

export const insertCommunicationTemplateSchema = createInsertSchema(communicationTemplates).pick({
  name: true,
  type: true,
  subject: true,
  content: true,
  isDefault: true,
});

// Select schemas
export const selectCommunicationCampaignSchema = createSelectSchema(communicationCampaigns);
export const selectCommunicationTemplateSchema = createSelectSchema(communicationTemplates);
export const selectCommunicationRecipientSchema = createSelectSchema(communicationRecipients);

// Types
export type CommunicationCampaign = typeof communicationCampaigns.$inferSelect;
export type InsertCommunicationCampaign = typeof communicationCampaigns.$inferInsert;
export type CommunicationTemplate = typeof communicationTemplates.$inferSelect;
export type InsertCommunicationTemplate = typeof communicationTemplates.$inferInsert;
export type CommunicationRecipient = typeof communicationRecipients.$inferSelect;
export type InsertCommunicationRecipient = typeof communicationRecipients.$inferInsert;

export type CommunicationType = 'newsletter' | 'announcement' | 'update' | 'emergency';
export type CommunicationStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
export type RecipientType = 'all' | 'owners' | 'tenants' | 'units' | 'individual' | 'manual';
export type RecipientStatus = 'pending' | 'sent' | 'failed' | 'bounced';

// Bylaws Schema
export const bylawCategories = pgTable("bylaw_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  displayOrder: integer("display_order").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bylaws = pgTable("bylaws", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  sectionNumber: text("section_number").notNull().unique(), // e.g., "3.4.2", "Section 10"
  title: text("title").notNull(),
  content: text("content").notNull(),
  parentSectionId: integer("parent_section_id").references(() => bylaws.id),
  sectionOrder: integer("section_order").notNull(),
  partNumber: text("part_number"), // e.g., "PART 2", "PART 10"
  partTitle: text("part_title"), // e.g., "DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS"
  isActive: boolean("is_active").default(true).notNull(),
  effectiveDate: date("effective_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  updatedById: integer("updated_by_id").references(() => users.id),
});

export const bylawCategoryLinks = pgTable("bylaw_category_links", {
  id: serial("id").primaryKey(),
  bylawId: integer("bylaw_id").notNull().references(() => bylaws.id, { onDelete: 'cascade' }),
  categoryId: integer("category_id").notNull().references(() => bylawCategories.id, { onDelete: 'cascade' }),
}, (table) => ({
  uniqueLink: unique().on(table.bylawId, table.categoryId),
}));

export const bylawRevisions = pgTable("bylaw_revisions", {
  id: serial("id").primaryKey(),
  bylawId: integer("bylaw_id").notNull().references(() => bylaws.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  revisionNotes: text("revision_notes"),
  effectiveDate: date("effective_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
});

// Insert schemas for bylaws
export const insertBylawCategorySchema = createInsertSchema(bylawCategories).pick({
  name: true,
  description: true,
  displayOrder: true,
  isActive: true,
});

export const insertBylawSchema = createInsertSchema(bylaws).pick({
  sectionNumber: true,
  title: true,
  content: true,
  parentSectionId: true,
  sectionOrder: true,
  partNumber: true,
  partTitle: true,
  isActive: true,
  effectiveDate: true,
});

export const insertBylawRevisionSchema = createInsertSchema(bylawRevisions).pick({
  bylawId: true,
  title: true,
  content: true,
  revisionNotes: true,
  effectiveDate: true,
});

// Relations
export const bylawsRelations = relations(bylaws, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [bylaws.createdById],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [bylaws.updatedById],
    references: [users.id],
  }),
  parentSection: one(bylaws, {
    fields: [bylaws.parentSectionId],
    references: [bylaws.id],
  }),
  childSections: many(bylaws),
  categoryLinks: many(bylawCategoryLinks),
  revisions: many(bylawRevisions),
}));

export const bylawCategoriesRelations = relations(bylawCategories, ({ many }) => ({
  categoryLinks: many(bylawCategoryLinks),
}));

export const bylawCategoryLinksRelations = relations(bylawCategoryLinks, ({ one }) => ({
  bylaw: one(bylaws, {
    fields: [bylawCategoryLinks.bylawId],
    references: [bylaws.id],
  }),
  category: one(bylawCategories, {
    fields: [bylawCategoryLinks.categoryId],
    references: [bylawCategories.id],
  }),
}));

export const bylawRevisionsRelations = relations(bylawRevisions, ({ one }) => ({
  bylaw: one(bylaws, {
    fields: [bylawRevisions.bylawId],
    references: [bylaws.id],
  }),
  createdBy: one(users, {
    fields: [bylawRevisions.createdById],
    references: [users.id],
  }),
}));

// Types
export type BylawCategory = typeof bylawCategories.$inferSelect;
export type InsertBylawCategory = z.infer<typeof insertBylawCategorySchema>;
export type Bylaw = typeof bylaws.$inferSelect;
export type InsertBylaw = z.infer<typeof insertBylawSchema>;
export type BylawCategoryLink = typeof bylawCategoryLinks.$inferSelect;
export type BylawRevision = typeof bylawRevisions.$inferSelect;
export type InsertBylawRevision = z.infer<typeof insertBylawRevisionSchema>;

// New table for email tracking events
export const emailTrackingEvents = pgTable("email_tracking_events", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => communicationCampaigns.id, { onDelete: 'cascade' }),
  recipientId: integer("recipient_id").notNull().references(() => communicationRecipients.id, { onDelete: 'cascade' }),
  trackingId: text("tracking_id").notNull(),
  eventType: text("event_type").notNull(), // 'open', 'click', 'bounce', 'unsubscribe'
  eventData: jsonb("event_data"), // Additional event data (IP, user agent, location, etc.)
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// New table for manual email recipients (individual entries)
export const manualEmailRecipients = pgTable("manual_email_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => communicationCampaigns.id, { onDelete: 'cascade' }),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailTrackingEventsRelations = relations(emailTrackingEvents, ({ one }) => ({
  campaign: one(communicationCampaigns, {
    fields: [emailTrackingEvents.campaignId],
    references: [communicationCampaigns.id],
  }),
  recipient: one(communicationRecipients, {
    fields: [emailTrackingEvents.recipientId],
    references: [communicationRecipients.id],
  }),
}));

export const manualEmailRecipientsRelations = relations(manualEmailRecipients, ({ one }) => ({
  campaign: one(communicationCampaigns, {
    fields: [manualEmailRecipients.campaignId],
    references: [communicationCampaigns.id],
  }),
}));

// Types
export type EmailTrackingEvent = typeof emailTrackingEvents.$inferSelect;
export type InsertEmailTrackingEvent = typeof emailTrackingEvents.$inferInsert;
export type ManualEmailRecipient = typeof manualEmailRecipients.$inferSelect;
export type InsertManualEmailRecipient = typeof manualEmailRecipients.$inferInsert;

