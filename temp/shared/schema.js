"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bylawCategories = exports.selectCommunicationRecipientSchema = exports.selectCommunicationTemplateSchema = exports.selectCommunicationCampaignSchema = exports.insertCommunicationTemplateSchema = exports.insertCommunicationCampaignSchema = exports.communicationTemplatesRelations = exports.communicationRecipientsRelations = exports.communicationCampaignsRelations = exports.communicationTemplates = exports.communicationRecipients = exports.communicationCampaigns = exports.unitFacilitiesRelations = exports.unitPersonRolesRelations = exports.personsRelations = exports.insertViolationAccessLinkSchema = exports.violationAccessLinks = exports.insertUnitPersonRoleSchema = exports.unitPersonRoles = exports.insertPersonSchema = exports.persons = exports.systemSettingsRelations = exports.bikeLockersRelations = exports.storageLockersRelations = exports.parkingSpotsRelations = exports.propertyUnitsRelations = exports.violationHistoriesRelations = exports.insertViolationHistorySchema = exports.violationHistories = exports.insertViolationSchema = exports.violationsRelations = exports.violations = exports.insertSystemSettingSchema = exports.systemSettings = exports.insertViolationCategorySchema = exports.violationCategories = exports.insertUnitFacilitySchema = exports.unitFacilities = exports.insertBikeLockerSchema = exports.bikeLockers = exports.insertStorageLockerSchema = exports.storageLockers = exports.insertParkingSpotSchema = exports.parkingSpots = exports.insertPropertyUnitSchema = exports.insertCustomerSchema = exports.propertyUnits = exports.customers = exports.insertProfileSchema = exports.profiles = void 0;
exports.adminAnnouncements = exports.auditLogs = exports.emailVerificationCodes = exports.emailSendAttemptsRelations = exports.emailIdempotencyKeysRelations = exports.emailDeduplicationLog = exports.emailSendAttempts = exports.emailIdempotencyKeys = exports.manualEmailRecipientsRelations = exports.emailTrackingEventsRelations = exports.manualEmailRecipients = exports.emailTrackingEvents = exports.bylawRevisionsRelations = exports.bylawCategoryLinksRelations = exports.bylawCategoriesRelations = exports.bylawsRelations = exports.insertBylawRevisionSchema = exports.insertBylawSchema = exports.insertBylawCategorySchema = exports.bylawRevisions = exports.bylawCategoryLinks = exports.bylaws = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_2 = require("drizzle-orm/pg-core");
const crypto_1 = __importDefault(require("crypto"));
// Profiles table, linked to Supabase auth.users
exports.profiles = (0, pg_core_1.pgTable)("profiles", {
    id: (0, pg_core_1.uuid)("id").primaryKey(), // This will be the user's ID from Supabase Auth
    fullName: (0, pg_core_1.text)("full_name"),
    role: (0, pg_core_1.text)("role").notNull().default('user'), // e.g., 'admin', 'council', 'user'
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.insertProfileSchema = (0, drizzle_zod_1.createInsertSchema)(exports.profiles);
// Customer records schema (enhanced property units)
exports.customers = (0, pg_core_1.pgTable)("customers", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    uuid: (0, pg_core_1.uuid)("uuid").defaultRandom().notNull().unique(),
    unitNumber: (0, pg_core_1.text)("unit_number").notNull(),
    floor: (0, pg_core_1.text)("floor"),
    ownerName: (0, pg_core_1.text)("owner_name").notNull(),
    ownerEmail: (0, pg_core_1.text)("owner_email").notNull(),
    tenantName: (0, pg_core_1.text)("tenant_name"),
    tenantEmail: (0, pg_core_1.text)("tenant_email"),
    phone: (0, pg_core_1.text)("phone"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    active: true,
});
// For backward compatibility, property units now references customers
exports.propertyUnits = (0, pg_core_1.pgTable)("property_units", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    customerId: (0, pg_core_1.integer)("customer_id").references(() => exports.customers.id),
    unitNumber: (0, pg_core_1.text)("unit_number").notNull().unique(),
    strataLot: (0, pg_core_1.text)("strata_lot"),
    floor: (0, pg_core_1.text)("floor"),
    townhouse: (0, pg_core_1.boolean)("townhouse").default(false).notNull(),
    // Mailing address fields
    mailingStreet1: (0, pg_core_1.text)("mailing_street1"),
    mailingStreet2: (0, pg_core_1.text)("mailing_street2"),
    mailingCity: (0, pg_core_1.text)("mailing_city"),
    mailingStateProvince: (0, pg_core_1.text)("mailing_state_province"),
    mailingPostalCode: (0, pg_core_1.text)("mailing_postal_code"),
    mailingCountry: (0, pg_core_1.text)("mailing_country"),
    // Contact and notes
    phone: (0, pg_core_1.text)("phone"),
    notes: (0, pg_core_1.text)("notes"),
    // ownerName, ownerEmail, tenantName, tenantEmail are deprecated and will be removed.
    // Use the persons and unitPersonRoles tables instead.
    ownerName: (0, pg_core_1.text)("owner_name"), // Deprecated
    ownerEmail: (0, pg_core_1.text)("owner_email"), // Deprecated
    tenantName: (0, pg_core_1.text)("tenant_name"), // Deprecated
    tenantEmail: (0, pg_core_1.text)("tenant_email"), // Deprecated
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.insertCustomerSchema = (0, drizzle_zod_1.createInsertSchema)(exports.customers).pick({
    unitNumber: true,
    floor: true,
    ownerName: true,
    ownerEmail: true,
    tenantName: true,
    tenantEmail: true,
    phone: true,
    notes: true,
});
exports.insertPropertyUnitSchema = (0, drizzle_zod_1.createInsertSchema)(exports.propertyUnits).pick({
    unitNumber: true,
    strataLot: true,
    floor: true,
    townhouse: true,
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
// Parking spots table
exports.parkingSpots = (0, pg_core_1.pgTable)("parking_spots", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    unitId: (0, pg_core_1.integer)("unit_id").notNull().references(() => exports.propertyUnits.id, { onDelete: 'cascade' }),
    identifier: (0, pg_core_1.text)("identifier").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.insertParkingSpotSchema = (0, drizzle_zod_1.createInsertSchema)(exports.parkingSpots).pick({
    unitId: true,
    identifier: true,
});
// Storage lockers table
exports.storageLockers = (0, pg_core_1.pgTable)("storage_lockers", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    unitId: (0, pg_core_1.integer)("unit_id").notNull().references(() => exports.propertyUnits.id, { onDelete: 'cascade' }),
    identifier: (0, pg_core_1.text)("identifier").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.insertStorageLockerSchema = (0, drizzle_zod_1.createInsertSchema)(exports.storageLockers).pick({
    unitId: true,
    identifier: true,
});
// Bike lockers table
exports.bikeLockers = (0, pg_core_1.pgTable)("bike_lockers", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    unitId: (0, pg_core_1.integer)("unit_id").notNull().references(() => exports.propertyUnits.id, { onDelete: 'cascade' }),
    identifier: (0, pg_core_1.text)("identifier").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.insertBikeLockerSchema = (0, drizzle_zod_1.createInsertSchema)(exports.bikeLockers).pick({
    unitId: true,
    identifier: true,
});
// DEPRECATED: Old UnitFacilities table - to be removed after migration
exports.unitFacilities = (0, pg_core_1.pgTable)("unit_facilities", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    unitId: (0, pg_core_1.integer)("unit_id").notNull().references(() => exports.propertyUnits.id, { onDelete: 'cascade' }).unique(), // Ensure one-to-one
    parkingSpots: (0, pg_core_1.text)("parking_spots"),
    storageLockers: (0, pg_core_1.text)("storage_lockers"),
    bikeLockers: (0, pg_core_1.text)("bike_lockers"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.insertUnitFacilitySchema = (0, drizzle_zod_1.createInsertSchema)(exports.unitFacilities);
// Violation categories schema
exports.violationCategories = (0, pg_core_1.pgTable)("violation_categories", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull().unique(),
    description: (0, pg_core_1.text)("description"),
    bylawReference: (0, pg_core_1.text)("bylaw_reference"),
    defaultFineAmount: (0, pg_core_1.integer)("default_fine_amount"),
    active: (0, pg_core_1.boolean)("active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.insertViolationCategorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.violationCategories).pick({
    name: true,
    description: true,
    bylawReference: true,
    defaultFineAmount: true,
    active: true,
});
// System settings schema (for global email settings, etc.)
exports.systemSettings = (0, pg_core_1.pgTable)("system_settings", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    settingKey: (0, pg_core_1.text)("setting_key").notNull().unique(),
    settingValue: (0, pg_core_1.text)("setting_value"),
    description: (0, pg_core_1.text)("description"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    updatedById: (0, pg_core_1.uuid)("updated_by_id").references(() => exports.profiles.id),
});
exports.insertSystemSettingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.systemSettings).pick({
    settingKey: true,
    settingValue: true,
    description: true,
    updatedById: true,
});
exports.violations = (0, pg_core_1.pgTable)("violations", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    uuid: (0, pg_core_1.uuid)("uuid").$defaultFn(() => crypto_1.default.randomUUID()).notNull().unique(),
    referenceNumber: (0, pg_core_1.uuid)("reference_number").defaultRandom().notNull().unique(),
    unitId: (0, pg_core_1.integer)("unit_id").notNull().references(() => exports.propertyUnits.id),
    reportedById: (0, pg_core_1.uuid)("reported_by_id").notNull().references(() => exports.profiles.id),
    categoryId: (0, pg_core_1.integer)("category_id").references(() => exports.violationCategories.id),
    violationType: (0, pg_core_1.text)("violation_type").notNull(),
    violationDate: (0, pg_core_1.timestamp)("violation_date").notNull(),
    violationTime: (0, pg_core_1.text)("violation_time"),
    description: (0, pg_core_1.text)("description").notNull(),
    bylawReference: (0, pg_core_1.text)("bylaw_reference"),
    status: (0, pg_core_1.text)("status").notNull().default("pending_approval"),
    fineAmount: (0, pg_core_1.integer)("fine_amount"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    attachments: (0, pg_core_1.jsonb)("attachments").$type().default([]),
    pdfGenerated: (0, pg_core_1.boolean)("pdf_generated").default(false),
    pdfPath: (0, pg_core_1.text)("pdf_path"),
    // New violation details fields
    incidentArea: (0, pg_core_1.text)("incident_area"),
    conciergeName: (0, pg_core_1.text)("concierge_name"),
    peopleInvolved: (0, pg_core_1.text)("people_involved"),
    noticedBy: (0, pg_core_1.text)("noticed_by"),
    damageToProperty: (0, pg_core_1.text)("damage_to_property"), // 'yes', 'no', or null
    damageDetails: (0, pg_core_1.text)("damage_details"),
    policeInvolved: (0, pg_core_1.text)("police_involved"), // 'yes', 'no', or null
    policeDetails: (0, pg_core_1.text)("police_details"),
});
exports.violationsRelations = (0, drizzle_orm_1.relations)(exports.violations, ({ one }) => ({
    unit: one(exports.propertyUnits, {
        fields: [exports.violations.unitId],
        references: [exports.propertyUnits.id],
    }),
    reportedBy: one(exports.profiles, {
        fields: [exports.violations.reportedById],
        references: [exports.profiles.id],
    }),
    category: one(exports.violationCategories, {
        fields: [exports.violations.categoryId],
        references: [exports.violationCategories.id],
    }),
}));
exports.insertViolationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.violations).pick({
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
    incidentArea: true,
    conciergeName: true,
    peopleInvolved: true,
    noticedBy: true,
    damageToProperty: true,
    damageDetails: true,
    policeInvolved: true,
    policeDetails: true,
});
// Violation history/comments schema
exports.violationHistories = (0, pg_core_1.pgTable)("violation_histories", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    violationId: (0, pg_core_1.integer)("violation_id").references(() => exports.violations.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.profiles.id),
    action: (0, pg_core_1.text)("action").notNull(),
    details: (0, pg_core_1.jsonb)("details"),
    rejectionReason: (0, pg_core_1.text)("rejection_reason"), // New field for rejection reason
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.insertViolationHistorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.violationHistories);
exports.violationHistoriesRelations = (0, drizzle_orm_1.relations)(exports.violationHistories, ({ one }) => ({
    violation: one(exports.violations, {
        fields: [exports.violationHistories.violationId],
        references: [exports.violations.id],
    }),
    user: one(exports.profiles, {
        fields: [exports.violationHistories.userId],
        references: [exports.profiles.id],
    }),
}));
// Types
// Define relationships for property units
exports.propertyUnitsRelations = (0, drizzle_orm_1.relations)(exports.propertyUnits, ({ one, many }) => ({
    customer: one(exports.customers, {
        fields: [exports.propertyUnits.customerId],
        references: [exports.customers.id],
    }),
    unitRoles: many(exports.unitPersonRoles),
    // New facility relations
    parkingSpots: many(exports.parkingSpots),
    storageLockers: many(exports.storageLockers),
    bikeLockers: many(exports.bikeLockers),
    // Deprecated - will be removed
    facilities: one(exports.unitFacilities, {
        fields: [exports.propertyUnits.id],
        references: [exports.unitFacilities.unitId],
    })
}));
// Define relationships for parking spots
exports.parkingSpotsRelations = (0, drizzle_orm_1.relations)(exports.parkingSpots, ({ one }) => ({
    propertyUnit: one(exports.propertyUnits, {
        fields: [exports.parkingSpots.unitId],
        references: [exports.propertyUnits.id],
    }),
}));
// Define relationships for storage lockers
exports.storageLockersRelations = (0, drizzle_orm_1.relations)(exports.storageLockers, ({ one }) => ({
    propertyUnit: one(exports.propertyUnits, {
        fields: [exports.storageLockers.unitId],
        references: [exports.propertyUnits.id],
    }),
}));
// Define relationships for bike lockers
exports.bikeLockersRelations = (0, drizzle_orm_1.relations)(exports.bikeLockers, ({ one }) => ({
    propertyUnit: one(exports.propertyUnits, {
        fields: [exports.bikeLockers.unitId],
        references: [exports.propertyUnits.id],
    }),
}));
// Define relationships for system settings
exports.systemSettingsRelations = (0, drizzle_orm_1.relations)(exports.systemSettings, ({ one }) => ({
    updatedBy: one(exports.profiles, {
        fields: [exports.systemSettings.updatedById],
        references: [exports.profiles.id],
    }),
}));
// Persons table (for owners/tenants)
exports.persons = (0, pg_core_1.pgTable)("persons", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    // TODO: Add unique constraints back after data migration for existing records
    authUserId: (0, pg_core_1.text)("auth_user_id"), // Link to Supabase Auth User ID for system users
    fullName: (0, pg_core_1.text)("full_name").notNull(),
    // TODO: Add unique constraints back after data migration for existing records
    email: (0, pg_core_1.text)("email").notNull(),
    phone: (0, pg_core_1.text)("phone"),
    isSystemUser: (0, pg_core_1.boolean)("is_system_user").default(false).notNull(), // True if this person can log in
    // Pet information
    hasCat: (0, pg_core_1.boolean)("has_cat").default(false),
    hasDog: (0, pg_core_1.boolean)("has_dog").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.insertPersonSchema = (0, drizzle_zod_1.createInsertSchema)(exports.persons).pick({
    fullName: true,
    email: true,
    phone: true,
    // Add pet info to insert schema
    hasCat: true,
    hasDog: true,
});
// Unit-Person Roles (many-to-many, with role: 'owner' | 'tenant')
exports.unitPersonRoles = (0, pg_core_1.pgTable)("unit_person_roles", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    unitId: (0, pg_core_1.integer)("unit_id").notNull().references(() => exports.propertyUnits.id),
    personId: (0, pg_core_1.integer)("person_id").notNull().references(() => exports.persons.id),
    role: (0, pg_core_1.text)("role").notNull(), // 'owner' or 'tenant'
    receiveEmailNotifications: (0, pg_core_1.boolean)("receive_email_notifications").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.insertUnitPersonRoleSchema = (0, drizzle_zod_1.createInsertSchema)(exports.unitPersonRoles).pick({
    unitId: true,
    personId: true,
    role: true,
});
// Violation access links schema (for secure public comment/evidence links)
exports.violationAccessLinks = (0, pg_core_1.pgTable)("violation_access_links", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    violationId: (0, pg_core_1.integer)("violation_id").notNull().references(() => exports.violations.id),
    violationUuid: (0, pg_core_1.uuid)("violation_uuid").references(() => exports.violations.uuid), // Optional for backward compatibility
    recipientEmail: (0, pg_core_1.text)("recipient_email").notNull(),
    token: (0, pg_core_1.uuid)("token").defaultRandom().notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    usedAt: (0, pg_core_1.timestamp)("used_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.insertViolationAccessLinkSchema = (0, drizzle_zod_1.createInsertSchema)(exports.violationAccessLinks).pick({
    violationId: true,
    violationUuid: true,
    recipientEmail: true,
    token: true,
    expiresAt: true,
});
// Define relationships for persons
exports.personsRelations = (0, drizzle_orm_1.relations)(exports.persons, ({ many }) => ({
    unitRoles: many(exports.unitPersonRoles),
}));
// Define relationships for unitPersonRoles
exports.unitPersonRolesRelations = (0, drizzle_orm_1.relations)(exports.unitPersonRoles, ({ one }) => ({
    propertyUnit: one(exports.propertyUnits, {
        fields: [exports.unitPersonRoles.unitId],
        references: [exports.propertyUnits.id],
    }),
    person: one(exports.persons, {
        fields: [exports.unitPersonRoles.personId],
        references: [exports.persons.id],
    }),
}));
// Define relationships for unitFacilities
exports.unitFacilitiesRelations = (0, drizzle_orm_1.relations)(exports.unitFacilities, ({ one }) => ({
    propertyUnit: one(exports.propertyUnits, {
        fields: [exports.unitFacilities.unitId],
        references: [exports.propertyUnits.id],
    }),
}));
// Communications Schema
exports.communicationCampaigns = (0, pg_core_1.pgTable)("communication_campaigns", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    uuid: (0, pg_core_1.uuid)("uuid").defaultRandom().notNull().unique(),
    title: (0, pg_core_1.text)("title").notNull(),
    type: (0, pg_core_1.text)("type").notNull(), // 'newsletter', 'announcement', 'update', 'emergency'
    status: (0, pg_core_1.text)("status").default("draft").notNull(), // 'draft', 'scheduled', 'sending', 'sent', 'failed'
    subject: (0, pg_core_1.text)("subject").notNull(),
    content: (0, pg_core_1.text)("content").notNull(), // HTML content
    plainTextContent: (0, pg_core_1.text)("plain_text_content"), // Plain text version
    scheduledAt: (0, pg_core_1.timestamp)("scheduled_at"),
    sentAt: (0, pg_core_1.timestamp)("sent_at"),
    createdById: (0, pg_core_1.integer)("created_by_id").notNull().references(() => exports.profiles.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.communicationRecipients = (0, pg_core_1.pgTable)("communication_recipients", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    campaignId: (0, pg_core_1.integer)("campaign_id").notNull().references(() => exports.communicationCampaigns.id, { onDelete: 'cascade' }),
    recipientType: (0, pg_core_1.text)("recipient_type").notNull(), // 'all', 'owners', 'tenants', 'units', 'individual', 'manual'
    unitId: (0, pg_core_1.integer)("unit_id").references(() => exports.propertyUnits.id),
    personId: (0, pg_core_1.integer)("person_id").references(() => exports.persons.id),
    email: (0, pg_core_1.text)("email").notNull(),
    recipientName: (0, pg_core_1.text)("recipient_name").notNull(),
    status: (0, pg_core_1.text)("status").default("pending").notNull(), // 'pending', 'sent', 'failed', 'bounced'
    sentAt: (0, pg_core_1.timestamp)("sent_at"),
    errorMessage: (0, pg_core_1.text)("error_message"),
    trackingId: (0, pg_core_1.text)("tracking_id").unique(), // Unique tracking ID for this recipient
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.communicationTemplates = (0, pg_core_1.pgTable)("communication_templates", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    uuid: (0, pg_core_1.uuid)("uuid").defaultRandom().notNull().unique(),
    name: (0, pg_core_1.text)("name").notNull(),
    type: (0, pg_core_1.text)("type").notNull(), // 'newsletter', 'announcement', 'update', 'emergency'
    subject: (0, pg_core_1.text)("subject").notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    isDefault: (0, pg_core_1.boolean)("is_default").default(false).notNull(),
    createdById: (0, pg_core_1.integer)("created_by_id").notNull().references(() => exports.profiles.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Relations
exports.communicationCampaignsRelations = (0, drizzle_orm_1.relations)(exports.communicationCampaigns, ({ one, many }) => ({
    createdBy: one(exports.profiles, {
        fields: [exports.communicationCampaigns.createdById],
        references: [exports.profiles.id],
    }),
    recipients: many(exports.communicationRecipients),
}));
exports.communicationRecipientsRelations = (0, drizzle_orm_1.relations)(exports.communicationRecipients, ({ one }) => ({
    campaign: one(exports.communicationCampaigns, {
        fields: [exports.communicationRecipients.campaignId],
        references: [exports.communicationCampaigns.id],
    }),
    unit: one(exports.propertyUnits, {
        fields: [exports.communicationRecipients.unitId],
        references: [exports.propertyUnits.id],
    }),
    person: one(exports.persons, {
        fields: [exports.communicationRecipients.personId],
        references: [exports.persons.id],
    }),
}));
exports.communicationTemplatesRelations = (0, drizzle_orm_1.relations)(exports.communicationTemplates, ({ one }) => ({
    createdBy: one(exports.profiles, {
        fields: [exports.communicationTemplates.createdById],
        references: [exports.profiles.id],
    }),
}));
// Insert schemas
exports.insertCommunicationCampaignSchema = (0, drizzle_zod_1.createInsertSchema)(exports.communicationCampaigns).pick({
    title: true,
    type: true,
    subject: true,
    content: true,
    plainTextContent: true,
    scheduledAt: true,
});
exports.insertCommunicationTemplateSchema = (0, drizzle_zod_1.createInsertSchema)(exports.communicationTemplates).pick({
    name: true,
    type: true,
    subject: true,
    content: true,
    isDefault: true,
});
// Select schemas
exports.selectCommunicationCampaignSchema = (0, drizzle_zod_1.createSelectSchema)(exports.communicationCampaigns);
exports.selectCommunicationTemplateSchema = (0, drizzle_zod_1.createSelectSchema)(exports.communicationTemplates);
exports.selectCommunicationRecipientSchema = (0, drizzle_zod_1.createSelectSchema)(exports.communicationRecipients);
// Bylaws Schema
exports.bylawCategories = (0, pg_core_1.pgTable)("bylaw_categories", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull().unique(),
    description: (0, pg_core_1.text)("description"),
    displayOrder: (0, pg_core_1.integer)("display_order").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.bylaws = (0, pg_core_1.pgTable)("bylaws", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    uuid: (0, pg_core_1.uuid)("uuid").defaultRandom().notNull().unique(),
    sectionNumber: (0, pg_core_1.text)("section_number").notNull().unique(), // e.g., "3.4.2", "Section 10"
    title: (0, pg_core_1.text)("title").notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    parentSectionId: (0, pg_core_1.integer)("parent_section_id").references(() => exports.bylaws.id),
    sectionOrder: (0, pg_core_1.integer)("section_order").notNull(),
    partNumber: (0, pg_core_1.text)("part_number"), // e.g., "PART 2", "PART 10"
    partTitle: (0, pg_core_1.text)("part_title"), // e.g., "DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS"
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    effectiveDate: (0, pg_core_1.date)("effective_date"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    createdById: (0, pg_core_1.integer)("created_by_id").notNull().references(() => exports.profiles.id),
    updatedById: (0, pg_core_1.integer)("updated_by_id").references(() => exports.profiles.id),
});
exports.bylawCategoryLinks = (0, pg_core_1.pgTable)("bylaw_category_links", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    bylawId: (0, pg_core_1.integer)("bylaw_id").notNull().references(() => exports.bylaws.id, { onDelete: 'cascade' }),
    categoryId: (0, pg_core_1.integer)("category_id").notNull().references(() => exports.bylawCategories.id, { onDelete: 'cascade' }),
}, (table) => ({
    uniqueLink: (0, pg_core_2.unique)().on(table.bylawId, table.categoryId),
}));
exports.bylawRevisions = (0, pg_core_1.pgTable)("bylaw_revisions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    bylawId: (0, pg_core_1.integer)("bylaw_id").notNull().references(() => exports.bylaws.id, { onDelete: 'cascade' }),
    title: (0, pg_core_1.text)("title").notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    revisionNotes: (0, pg_core_1.text)("revision_notes"),
    effectiveDate: (0, pg_core_1.date)("effective_date"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    createdById: (0, pg_core_1.integer)("created_by_id").notNull().references(() => exports.profiles.id),
});
// Insert schemas for bylaws
exports.insertBylawCategorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.bylawCategories).pick({
    name: true,
    description: true,
    displayOrder: true,
    isActive: true,
});
exports.insertBylawSchema = (0, drizzle_zod_1.createInsertSchema)(exports.bylaws).pick({
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
exports.insertBylawRevisionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.bylawRevisions).pick({
    bylawId: true,
    title: true,
    content: true,
    revisionNotes: true,
    effectiveDate: true,
});
// Relations
exports.bylawsRelations = (0, drizzle_orm_1.relations)(exports.bylaws, ({ one, many }) => ({
    createdBy: one(exports.profiles, {
        fields: [exports.bylaws.createdById],
        references: [exports.profiles.id],
    }),
    updatedBy: one(exports.profiles, {
        fields: [exports.bylaws.updatedById],
        references: [exports.profiles.id],
    }),
    parentSection: one(exports.bylaws, {
        fields: [exports.bylaws.parentSectionId],
        references: [exports.bylaws.id],
    }),
    childSections: many(exports.bylaws),
    categoryLinks: many(exports.bylawCategoryLinks),
    revisions: many(exports.bylawRevisions),
}));
exports.bylawCategoriesRelations = (0, drizzle_orm_1.relations)(exports.bylawCategories, ({ many }) => ({
    categoryLinks: many(exports.bylawCategoryLinks),
}));
exports.bylawCategoryLinksRelations = (0, drizzle_orm_1.relations)(exports.bylawCategoryLinks, ({ one }) => ({
    bylaw: one(exports.bylaws, {
        fields: [exports.bylawCategoryLinks.bylawId],
        references: [exports.bylaws.id],
    }),
    category: one(exports.bylawCategories, {
        fields: [exports.bylawCategoryLinks.categoryId],
        references: [exports.bylawCategories.id],
    }),
}));
exports.bylawRevisionsRelations = (0, drizzle_orm_1.relations)(exports.bylawRevisions, ({ one }) => ({
    bylaw: one(exports.bylaws, {
        fields: [exports.bylawRevisions.bylawId],
        references: [exports.bylaws.id],
    }),
    createdBy: one(exports.profiles, {
        fields: [exports.bylawRevisions.createdById],
        references: [exports.profiles.id],
    }),
}));
// New table for email tracking events
exports.emailTrackingEvents = (0, pg_core_1.pgTable)("email_tracking_events", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    campaignId: (0, pg_core_1.integer)("campaign_id").notNull().references(() => exports.communicationCampaigns.id, { onDelete: 'cascade' }),
    recipientId: (0, pg_core_1.integer)("recipient_id").notNull().references(() => exports.communicationRecipients.id, { onDelete: 'cascade' }),
    trackingId: (0, pg_core_1.text)("tracking_id").notNull(),
    eventType: (0, pg_core_1.text)("event_type").notNull(), // 'open', 'click', 'bounce', 'unsubscribe'
    eventData: (0, pg_core_1.jsonb)("event_data"), // Additional event data (IP, user agent, location, etc.)
    timestamp: (0, pg_core_1.timestamp)("timestamp").defaultNow().notNull(),
    ipAddress: (0, pg_core_1.text)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
});
// New table for manual email recipients (individual entries)
exports.manualEmailRecipients = (0, pg_core_1.pgTable)("manual_email_recipients", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    campaignId: (0, pg_core_1.integer)("campaign_id").notNull().references(() => exports.communicationCampaigns.id, { onDelete: 'cascade' }),
    email: (0, pg_core_1.text)("email").notNull(),
    name: (0, pg_core_1.text)("name"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.emailTrackingEventsRelations = (0, drizzle_orm_1.relations)(exports.emailTrackingEvents, ({ one }) => ({
    campaign: one(exports.communicationCampaigns, {
        fields: [exports.emailTrackingEvents.campaignId],
        references: [exports.communicationCampaigns.id],
    }),
    recipient: one(exports.communicationRecipients, {
        fields: [exports.emailTrackingEvents.recipientId],
        references: [exports.communicationRecipients.id],
    }),
}));
exports.manualEmailRecipientsRelations = (0, drizzle_orm_1.relations)(exports.manualEmailRecipients, ({ one }) => ({
    campaign: one(exports.communicationCampaigns, {
        fields: [exports.manualEmailRecipients.campaignId],
        references: [exports.communicationCampaigns.id],
    }),
}));
// Email deduplication and idempotency tracking
exports.emailIdempotencyKeys = (0, pg_core_1.pgTable)("email_idempotency_keys", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    idempotencyKey: (0, pg_core_1.text)("idempotency_key").notNull().unique(),
    emailType: (0, pg_core_1.text)("email_type").notNull(), // 'violation_notification', 'violation_approved', 'campaign', 'system'
    recipientEmail: (0, pg_core_1.text)("recipient_email").notNull(),
    emailHash: (0, pg_core_1.text)("email_hash").notNull(), // Hash of email content for deduplication
    status: (0, pg_core_1.text)("status").default("sent").notNull(), // 'sent', 'failed', 'pending'
    sentAt: (0, pg_core_1.timestamp)("sent_at"),
    metadata: (0, pg_core_1.jsonb)("metadata"), // Store additional context (violationId, campaignId, etc.)
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(), // TTL for cleanup
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.emailSendAttempts = (0, pg_core_1.pgTable)("email_send_attempts", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    idempotencyKey: (0, pg_core_1.text)("idempotency_key").notNull().references(() => exports.emailIdempotencyKeys.idempotencyKey),
    attemptNumber: (0, pg_core_1.integer)("attempt_number").notNull().default(1),
    status: (0, pg_core_1.text)("status").notNull(), // 'pending', 'sent', 'failed', 'retrying'
    errorMessage: (0, pg_core_1.text)("error_message"),
    attemptedAt: (0, pg_core_1.timestamp)("attempted_at").defaultNow().notNull(),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
});
// Comprehensive email deduplication log
exports.emailDeduplicationLog = (0, pg_core_1.pgTable)("email_deduplication_log", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    recipientEmail: (0, pg_core_1.text)("recipient_email").notNull(),
    emailType: (0, pg_core_1.text)("email_type").notNull(),
    contentHash: (0, pg_core_1.text)("content_hash").notNull(), // Hash of subject + content
    originalIdempotencyKey: (0, pg_core_1.text)("original_idempotency_key").notNull(),
    duplicateIdempotencyKey: (0, pg_core_1.text)("duplicate_idempotency_key").notNull(),
    preventedAt: (0, pg_core_1.timestamp)("prevented_at").defaultNow().notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata"), // Context about why it was prevented
});
// Relations for email tracking
exports.emailIdempotencyKeysRelations = (0, drizzle_orm_1.relations)(exports.emailIdempotencyKeys, ({ many }) => ({
    attempts: many(exports.emailSendAttempts),
}));
exports.emailSendAttemptsRelations = (0, drizzle_orm_1.relations)(exports.emailSendAttempts, ({ one }) => ({
    idempotencyKey: one(exports.emailIdempotencyKeys, {
        fields: [exports.emailSendAttempts.idempotencyKey],
        references: [exports.emailIdempotencyKeys.idempotencyKey],
    }),
}));
// Email verification codes for public dispute workflow
exports.emailVerificationCodes = (0, pg_core_1.pgTable)("email_verification_codes", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    personId: (0, pg_core_1.integer)("person_id").notNull().references(() => exports.persons.id),
    violationId: (0, pg_core_1.integer)("violation_id").notNull().references(() => exports.violations.id),
    codeHash: (0, pg_core_1.text)("code_hash").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    usedAt: (0, pg_core_1.timestamp)("used_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.auditLogs = (0, pg_core_1.pgTable)("audit_logs", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    timestamp: (0, pg_core_1.timestamp)("timestamp", { withTimezone: true }).defaultNow().notNull(),
    userId: (0, pg_core_1.integer)("user_id").references(() => exports.profiles.id, { onDelete: 'set null' }),
    userName: (0, pg_core_1.text)("user_name"),
    userEmail: (0, pg_core_1.text)("user_email"),
    action: (0, pg_core_1.text)("action").notNull(),
    targetType: (0, pg_core_1.text)("target_type"),
    targetId: (0, pg_core_1.text)("target_id"),
    details: (0, pg_core_1.jsonb)("details"),
    ipAddress: (0, pg_core_1.text)("ip_address"),
});
exports.adminAnnouncements = (0, pg_core_1.pgTable)("admin_announcements", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    title: (0, pg_core_1.text)("title").notNull(),
    content: (0, pg_core_1.jsonb)("content").notNull(), // Tiptap JSON content
    htmlContent: (0, pg_core_1.text)("html_content").notNull(), // Rendered HTML for display
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    priority: (0, pg_core_1.integer)("priority").default(0).notNull(), // For ordering multiple announcements
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.integer)("created_by").references(() => exports.profiles.id, { onDelete: 'set null' }),
    updatedBy: (0, pg_core_1.integer)("updated_by").references(() => exports.profiles.id, { onDelete: 'set null' }),
});
