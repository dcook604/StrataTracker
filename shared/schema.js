import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, date, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { unique } from "drizzle-orm/pg-core";
import crypto from "crypto";
// Profiles table, linked to Supabase auth.users
export const profiles = pgTable("profiles", {
    id: uuid("id").primaryKey(), // This will be the user's ID from Supabase Auth
    fullName: text("full_name"),
    role: text("role").notNull().default('user'), // e.g., 'admin', 'council', 'user'
    updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertProfileSchema = createInsertSchema(profiles);
// Customer records schema (enhanced property units)
export const customers = pgTable("customers", {
    id: serial("id").primaryKey(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    unitNumber: text("unit_number").notNull(),
    floor: text("floor"),
    ownerName: text("owner_name").notNull(),
    ownerEmail: text("owner_email").notNull(),
    tenantName: text("tenant_name"),
    tenantEmail: text("tenant_email"),
    phone: text("phone"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    active: boolean("active").default(true).notNull(),
});
// For backward compatibility, property units now references customers
export const propertyUnits = pgTable("property_units", {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id").references(() => customers.id),
    unitNumber: text("unit_number").notNull().unique(),
    strataLot: text("strata_lot"),
    floor: text("floor"),
    townhouse: boolean("townhouse").default(false).notNull(),
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
export const insertCustomerSchema = createInsertSchema(customers).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
export const insertPropertyUnitSchema = createInsertSchema(propertyUnits).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    // Deprecated fields are not included in insert schema for new units
    ownerEmail: true,
    tenantEmail: true,
    ownerName: true,
    tenantName: true,
});
// Parking spots table
export const parkingSpots = pgTable("parking_spots", {
    id: serial("id").primaryKey(),
    unitId: integer("unit_id").notNull().references(() => propertyUnits.id, { onDelete: 'cascade' }),
    identifier: text("identifier").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertParkingSpotSchema = createInsertSchema(parkingSpots).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// Storage lockers table
export const storageLockers = pgTable("storage_lockers", {
    id: serial("id").primaryKey(),
    unitId: integer("unit_id").notNull().references(() => propertyUnits.id, { onDelete: 'cascade' }),
    identifier: text("identifier").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertStorageLockerSchema = createInsertSchema(storageLockers).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// Bike lockers table
export const bikeLockers = pgTable("bike_lockers", {
    id: serial("id").primaryKey(),
    unitId: integer("unit_id").notNull().references(() => propertyUnits.id, { onDelete: 'cascade' }),
    identifier: text("identifier").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertBikeLockerSchema = createInsertSchema(bikeLockers).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
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
export const insertViolationCategorySchema = createInsertSchema(violationCategories).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// System settings schema (for global email settings, etc.)
export const systemSettings = pgTable("system_settings", {
    id: serial("id").primaryKey(),
    settingKey: text("setting_key").notNull().unique(),
    settingValue: text("setting_value"),
    description: text("description"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    updatedById: uuid("updated_by_id").references(() => profiles.id),
});
export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
    id: true,
    updatedAt: true,
});
export const violations = pgTable("violations", {
    id: serial("id").primaryKey(),
    uuid: uuid("uuid").$defaultFn(() => crypto.randomUUID()).notNull().unique(),
    referenceNumber: uuid("reference_number").defaultRandom().notNull().unique(),
    unitId: integer("unit_id").notNull().references(() => propertyUnits.id),
    reportedById: uuid("reported_by_id").notNull().references(() => profiles.id),
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
    attachments: jsonb("attachments").$type().default([]),
    pdfGenerated: boolean("pdf_generated").default(false),
    pdfPath: text("pdf_path"),
    // New violation details fields
    incidentArea: text("incident_area"),
    conciergeName: text("concierge_name"),
    peopleInvolved: text("people_involved"),
    noticedBy: text("noticed_by"),
    damageToProperty: text("damage_to_property"), // 'yes', 'no', or null
    damageDetails: text("damage_details"),
    policeInvolved: text("police_involved"), // 'yes', 'no', or null
    policeDetails: text("police_details"),
});
export const violationsRelations = relations(violations, ({ one }) => ({
    unit: one(propertyUnits, {
        fields: [violations.unitId],
        references: [propertyUnits.id],
    }),
    reportedBy: one(profiles, {
        fields: [violations.reportedById],
        references: [profiles.id],
    }),
    category: one(violationCategories, {
        fields: [violations.categoryId],
        references: [violationCategories.id],
    }),
}));
export const insertViolationSchema = createInsertSchema(violations).omit({
    id: true,
    uuid: true,
    referenceNumber: true,
    createdAt: true,
    updatedAt: true,
    pdfGenerated: true,
    pdfPath: true,
    fineAmount: true,
});
// Violation history/comments schema
export const violationHistories = pgTable("violation_histories", {
    id: serial("id").primaryKey(),
    violationId: integer("violation_id").references(() => violations.id, { onDelete: 'cascade' }),
    userId: uuid("user_id").references(() => profiles.id),
    action: text("action").notNull(),
    details: jsonb("details"),
    rejectionReason: text("rejection_reason"), // New field for rejection reason
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertViolationHistorySchema = createInsertSchema(violationHistories);
export const violationHistoriesRelations = relations(violationHistories, ({ one }) => ({
    violation: one(violations, {
        fields: [violationHistories.violationId],
        references: [violations.id],
    }),
    user: one(profiles, {
        fields: [violationHistories.userId],
        references: [profiles.id],
    }),
}));
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
    updatedBy: one(profiles, {
        fields: [systemSettings.updatedById],
        references: [profiles.id],
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
export const insertPersonSchema = createInsertSchema(persons).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
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
export const insertUnitPersonRoleSchema = createInsertSchema(unitPersonRoles).omit({
    id: true,
    createdAt: true,
});
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
export const insertViolationAccessLinkSchema = createInsertSchema(violationAccessLinks).omit({
    id: true,
    createdAt: true,
    usedAt: true,
});
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
    createdById: uuid("created_by_id").notNull().references(() => profiles.id),
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
    trackingId: text("tracking_id").unique().notNull(), // Unique tracking ID for this recipient
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
    createdById: uuid("created_by_id").notNull().references(() => profiles.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
// Relations
export const communicationCampaignsRelations = relations(communicationCampaigns, ({ one, many }) => ({
    createdBy: one(profiles, {
        fields: [communicationCampaigns.createdById],
        references: [profiles.id],
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
    createdBy: one(profiles, {
        fields: [communicationTemplates.createdById],
        references: [profiles.id],
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
    parentSectionId: integer("parent_section_id"), // Self-reference defined below
    sectionOrder: integer("section_order").notNull(),
    partNumber: text("part_number"), // e.g., "PART 2", "PART 10"
    partTitle: text("part_title"), // e.g., "DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS"
    isActive: boolean("is_active").default(true).notNull(),
    effectiveDate: date("effective_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdById: uuid("created_by_id").notNull().references(() => profiles.id),
    updatedById: uuid("updated_by_id").references(() => profiles.id),
}, (table) => ({
    parentSectionFk: foreignKey({
        columns: [table.parentSectionId],
        foreignColumns: [table.id]
    }),
}));
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
    createdById: uuid("created_by_id").notNull().references(() => profiles.id),
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
    createdBy: one(profiles, {
        fields: [bylaws.createdById],
        references: [profiles.id],
    }),
    updatedBy: one(profiles, {
        fields: [bylaws.updatedById],
        references: [profiles.id],
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
    createdBy: one(profiles, {
        fields: [bylawRevisions.createdById],
        references: [profiles.id],
    }),
}));
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
// Email deduplication and idempotency tracking
export const emailIdempotencyKeys = pgTable("email_idempotency_keys", {
    id: serial("id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    emailType: text("email_type").notNull(), // 'violation_notification', 'violation_approved', 'campaign', 'system'
    recipientEmail: text("recipient_email").notNull(),
    emailHash: text("email_hash").notNull(), // Hash of email content for deduplication
    status: text("status").default("sent").notNull(), // 'sent', 'failed', 'pending'
    sentAt: timestamp("sent_at"),
    metadata: jsonb("metadata"), // Store additional context (violationId, campaignId, etc.)
    expiresAt: timestamp("expires_at").notNull(), // TTL for cleanup
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const emailSendAttempts = pgTable("email_send_attempts", {
    id: serial("id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull().references(() => emailIdempotencyKeys.idempotencyKey),
    attemptNumber: integer("attempt_number").notNull().default(1),
    status: text("status").notNull(), // 'pending', 'sent', 'failed', 'retrying'
    errorMessage: text("error_message"),
    attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
});
// Comprehensive email deduplication log
export const emailDeduplicationLog = pgTable("email_deduplication_log", {
    id: serial("id").primaryKey(),
    recipientEmail: text("recipient_email").notNull(),
    emailType: text("email_type").notNull(),
    contentHash: text("content_hash").notNull(), // Hash of subject + content
    originalIdempotencyKey: text("original_idempotency_key").notNull(),
    duplicateIdempotencyKey: text("duplicate_idempotency_key").notNull(),
    preventedAt: timestamp("prevented_at").defaultNow().notNull(),
    metadata: jsonb("metadata"), // Context about why it was prevented
});
// Relations for email tracking
export const emailIdempotencyKeysRelations = relations(emailIdempotencyKeys, ({ many }) => ({
    attempts: many(emailSendAttempts),
}));
export const emailSendAttemptsRelations = relations(emailSendAttempts, ({ one }) => ({
    idempotencyKey: one(emailIdempotencyKeys, {
        fields: [emailSendAttempts.idempotencyKey],
        references: [emailIdempotencyKeys.idempotencyKey],
    }),
}));
// Email verification codes for public dispute workflow
export const emailVerificationCodes = pgTable("email_verification_codes", {
    id: serial("id").primaryKey(),
    personId: integer("person_id").notNull().references(() => persons.id),
    violationId: integer("violation_id").notNull().references(() => violations.id),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const auditLogs = pgTable("audit_logs", {
    id: serial("id").primaryKey(),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
    userId: uuid("user_id_new").references(() => profiles.id, { onDelete: 'set null' }),
    userName: text("user_name"),
    userEmail: text("user_email"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    details: jsonb("details"),
    ipAddress: text("ip_address"),
});
export const adminAnnouncements = pgTable("admin_announcements", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    content: jsonb("content").notNull(), // Tiptap JSON content
    htmlContent: text("html_content").notNull(), // Rendered HTML for display
    isActive: boolean("is_active").default(true).notNull(),
    priority: integer("priority").default(0).notNull(), // For ordering multiple announcements
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: integer("created_by").references(() => profiles.id, { onDelete: 'set null' }),
    updatedBy: integer("updated_by").references(() => profiles.id, { onDelete: 'set null' }),
});
// Public user sessions table (for authenticated owner/tenant sessions)
export const publicUserSessions = pgTable("public_user_sessions", {
    id: serial("id").primaryKey(),
    sessionId: uuid("session_id").$defaultFn(() => crypto.randomUUID()).notNull().unique(),
    personId: integer("person_id").notNull().references(() => persons.id, { onDelete: 'cascade' }),
    unitId: integer("unit_id").notNull().references(() => propertyUnits.id, { onDelete: 'cascade' }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    data: jsonb("data"), // For any other session data
});
export const publicUserSessionsRelations = relations(publicUserSessions, ({ one }) => ({
    person: one(persons, {
        fields: [publicUserSessions.personId],
        references: [persons.id],
    }),
    unit: one(propertyUnits, {
        fields: [publicUserSessions.unitId],
        references: [propertyUnits.id],
    }),
}));
//# sourceMappingURL=schema.js.map