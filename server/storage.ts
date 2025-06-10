import { 
  profiles,
  customers,
  propertyUnits,
  violationCategories,
  systemSettings,
  violations,
  violationHistories,
  persons,
  type Profile, 
  type InsertProfile,
  type Customer,
  type InsertCustomer,
  type PropertyUnit, 
  type InsertPropertyUnit,
  type ViolationCategory,
  type InsertViolationCategory,
  type SystemSetting,
  type InsertSystemSetting,
  type Violation,
  type InsertViolation,
  type ViolationHistory,
  type InsertViolationHistory,
  type ViolationStatus,
  unitPersonRoles,
  type Person,
  type UnitPersonRole,
  type InsertPerson,
  type InsertUnitPersonRole,
  violationAccessLinks,
  type ViolationAccessLink,
  type InsertViolationAccessLink,
  unitFacilities,
  type InsertUnitFacility,
  type UnitFacility,
  parkingSpots,
  storageLockers,
  bikeLockers,
  type ParkingSpot,
  type StorageLocker,
  type BikeLocker,
  emailVerificationCodes,
  publicUserSessions
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, like, ilike, or, not, gte, lte, asc, SQL, Name, inArray, isNull, gt } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
// @ts-ignore
import memorystore from "memorystore";
import { relations, sql as drizzleSql, InferModel, count as drizzleCount } from 'drizzle-orm';
import { pgTable, serial, text, varchar, timestamp, integer, boolean, jsonb, pgEnum, PgTransaction } from 'drizzle-orm/pg-core';
import { drizzle, NodePgQueryResultHKT, NodePgDatabase } from 'drizzle-orm/node-postgres';
// @ts-ignore
import connectPgSimple from 'connect-pg-simple';
import logger from './utils/logger';
import { Buffer } from 'buffer';
import { randomUUID } from "crypto";

const scryptAsync = promisify(scrypt);

const MemoryStore = memorystore(session) as any;

export interface IStorage {
  // User operations
  getUser(id: string): Promise<Profile | undefined>;
  getUserByEmail(email: string): Promise<Profile | undefined>;
  createUser(user: InsertProfile): Promise<Profile>;
  updateUser(id: string, userData: Partial<InsertProfile>): Promise<Profile | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<Profile[]>;
  
  // Customer operations
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByUnitNumber(unitNumber: string): Promise<Customer | undefined>;
  getAllCustomers(page: number, limit: number, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{ customers: Customer[], total: number }>;
  searchCustomers(query: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  
  // Property units operations
  getPropertyUnit(id: number): Promise<PropertyUnit | undefined>;
  getPropertyUnitByUnitNumber(unitNumber: string): Promise<PropertyUnit | undefined>;
  getAllPropertyUnits(): Promise<PropertyUnit[]>;
  createPropertyUnit(unit: InsertPropertyUnit): Promise<PropertyUnit>;
  updatePropertyUnit(id: number, unit: Partial<InsertPropertyUnit>): Promise<PropertyUnit | undefined>;
  
  // Violation category operations
  getViolationCategory(id: number): Promise<ViolationCategory | undefined>;
  getAllViolationCategories(activeOnly?: boolean): Promise<ViolationCategory[]>;
  createViolationCategory(category: InsertViolationCategory): Promise<ViolationCategory>;
  updateViolationCategory(id: number, category: Partial<InsertViolationCategory>): Promise<ViolationCategory | undefined>;
  deleteViolationCategory(id: number): Promise<boolean>;
  
  // System settings operations
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
  updateSystemSetting(key: string, value: string, userId: string): Promise<SystemSetting>;
  
  // Violation operations
  getViolation(id: number): Promise<Violation | undefined>;
  getViolationByReference(referenceNumber: string): Promise<Violation | undefined>;
  getViolationWithUnit(id: number): Promise<(Violation & { unit: PropertyUnit & { ownerName?: string | null, ownerEmail?: string | null, tenantName?: string | null, tenantEmail?: string | null } }) | undefined>;
  getViolationWithUnitByUuid(uuid: string): Promise<(Violation & { unit: PropertyUnit & { ownerName?: string | null, ownerEmail?: string | null, tenantName?: string | null, tenantEmail?: string | null } }) | undefined>;
  getAllViolations(): Promise<(Violation & { unit: PropertyUnit })[]>;
  getViolationsByStatus(status: ViolationStatus): Promise<(Violation & { unit: PropertyUnit })[]>;
  getViolationsByUnit(unitId: number): Promise<Violation[]>;
  getViolationsByReporter(userId: string): Promise<Violation[]>;
  getViolationsByCategory(categoryId: number): Promise<Violation[]>;
  getRecentViolations(limit: number): Promise<(Violation & { unit: PropertyUnit })[]>;
  createViolation(violation: InsertViolation): Promise<Violation>;
  updateViolation(id: number, violation: Partial<InsertViolation>): Promise<Violation | undefined>;
  updateViolationStatus(id: number, status: ViolationStatus): Promise<Violation | undefined>;
  updateViolationStatusByUuid(uuid: string, status: ViolationStatus): Promise<Violation | undefined>;
  setViolationFine(id: number, amount: number): Promise<Violation | undefined>;
  setViolationFineByUuid(uuid: string, amount: number): Promise<Violation | undefined>;
  generateViolationPdf(id: number, pdfPath: string): Promise<Violation | undefined>;
  
  // Violation history operations
  getViolationHistory(violationId: number): Promise<ViolationHistoryWithUser[]>;
  addViolationHistory(history: InsertViolationHistory): Promise<ViolationHistory>;
  
  // Reporting operations
  getRepeatViolations(minCount: number): Promise<{ unitId: number, unitNumber: string, count: number, lastViolationDate: Date }[]>;
  getViolationStats(filters?: { from?: Date, to?: Date, categoryId?: number }): Promise<{
    totalViolations: number,
    newViolations: number,
    pendingViolations: number,
    approvedViolations: number,
    disputedViolations: number,
    rejectedViolations: number,
    resolvedViolations: number,
    averageResolutionTimeDays: number | null
  }>;
  getViolationsByMonth(filters?: { from?: Date, to?: Date, categoryId?: number }): Promise<{ month: string, count: number }[]>;
  getViolationsByType(filters?: { from?: Date, to?: Date, categoryId?: number }): Promise<{ type: string, count: number }[]>;
  getFilteredViolationsForReport(filters?: { from?: Date, to?: Date, categoryId?: number }): Promise<(Violation & { unit: PropertyUnit, category?: ViolationCategory })[]>;
  
  // Session store
  sessionStore: session.Store;

  getViolationsPaginated(page: number, limit: number, status?: string, unitId?: number, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{ violations: (Violation & { unit: PropertyUnit })[], total: number }>;
  getAllUnitsPaginated(page: number, limit: number, sortBy?: string, sortOrder?: 'asc' | 'desc', search?: string): Promise<{ units: PropertyUnit[], total: number }>;

  /**
   * Create a unit with multiple persons/roles (owners/tenants) and facilities in a single transaction.
   * @param unitData - { unit: InsertPropertyUnit, facilities: { parkingSpots?: string[], storageLockers?: string[], bikeLockers?: string[] }, persons: Array<{ fullName, email, phone, role: 'owner' | 'tenant', receiveEmailNotifications: boolean, hasCat?: boolean, hasDog?: boolean }> }
   * @returns The created unit, facilities, and associated persons/roles.
   */
  createUnitWithPersons(unitData: {
    unit: InsertPropertyUnit,
    facilities: {
      parkingSpots?: string[],
      storageLockers?: string[],
      bikeLockers?: string[]
    },
    persons: Array<{
      fullName: string;
      email: string;
      phone?: string;
      role: 'owner' | 'tenant';
      receiveEmailNotifications: boolean;
      hasCat?: boolean;
      hasDog?: boolean;
    }>
  }): Promise<{ unit: PropertyUnit; facilities: { parkingSpots: ParkingSpot[], storageLockers: StorageLocker[], bikeLockers: BikeLocker[] }; persons: Person[]; roles: UnitPersonRole[] }>;

  // Violation access link operations
  getViolationAccessLinkByToken(token: string): Promise<ViolationAccessLink | undefined>;
  markViolationAccessLinkUsed(id: number): Promise<void>;

  deleteViolation(id: number): Promise<boolean>;
  deleteViolationByUuid(uuid: string): Promise<boolean>;
  deleteUnit(id: number): Promise<boolean>;
  getUnitWithPersonsAndFacilities(id: number): Promise<{ unit: PropertyUnit; persons: (Person & { role: string; receiveEmailNotifications: boolean })[]; facilities: { parkingSpots: ParkingSpot[], storageLockers: StorageLocker[], bikeLockers: BikeLocker[] }; violationCount: number; violations: { id: number; referenceNumber: string; violationType: string; status: string; createdAt: Date }[] } | undefined>;
  getPendingApprovalViolations(userId: string): Promise<(Violation & { unit: PropertyUnit })[]>;

  getPersonsWithRolesForUnit(unitId: number): Promise<Array<{
    personId: number;
    fullName: string;
    email: string;
    role: string;
    receiveEmailNotifications: boolean;
  }>>;

  createViolationAccessLink(data: {
    violationId: number;
    violationUuid: string;
    recipientEmail: string;
    expiresInDays?: number;
  }): Promise<string | null>;

  getAdminAndCouncilUsers(): Promise<Array<{
    id: string;
    email: string;
    fullName: string | null;
  }>>;

  addEmailVerificationCode(params: { personId: number, violationId: number, codeHash: string, expiresAt: Date }): Promise<void>;
  getEmailVerificationCode(personId: number, violationId: number, codeHash: string): Promise<any>;
  markEmailVerificationCodeUsed(id: number): Promise<void>;

  /**
   * Returns total fines issued per month, filtered by date/category if provided.
   * Each entry: { month: 'YYYY-MM', totalFines: number }
   */
  getMonthlyFines(filters?: { from?: Date, to?: Date, categoryId?: number }): Promise<{ month: string, totalFines: number }[]>;

  /**
   * Updates a unit with its associated persons, roles, and facilities within a single transaction.
   * This method will replace existing persons/roles and facilities with the new data provided.
   * @param unitId The ID of the unit to update.
   * @param unitData The new data for the property_units table.
   * @param personsData An array of new persons and their roles for the unit.
   * @param facilitiesData An object containing arrays of new facility numbers (parking, storage, etc.).
   * @returns The fully updated unit object.
   */
  updateUnitWithPersonsAndFacilities(
    unitId: number,
    unitData: Partial<InsertPropertyUnit>,
    personsData: Array<{ id?: number; fullName: string; email: string; phone?: string; role: 'owner' | 'tenant'; receiveEmailNotifications: boolean }>,
    facilitiesData: { parkingSpots?: string[]; storageLockers?: string[]; bikeLockers?: string[] }
  ): Promise<{ unit: PropertyUnit; persons: Person[]; roles: UnitPersonRole[]; facilities: any }>;

  // Public user session management for owners/tenants
  createPublicUserSession(data: {
    personId: number;
    unitId: number;
    email: string;
    role: string;
    expiresInHours?: number;
  }): Promise<any>;

  getPublicUserSession(sessionId: string): Promise<any>;

  getViolationsForUnit(unitId: number, includeStatuses?: string[]): Promise<any[]>;

  expirePublicUserSession(sessionId: string): Promise<void>;
}

export interface ViolationHistoryWithUser extends ViolationHistory {
  userFullName?: string | null;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const pgSession = connectPgSimple(session);
    this.sessionStore = new pgSession({
      pool: db.session.client,
      createTableIfMissing: true,
    });
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }
  
  async getCustomerByUnitNumber(unitNumber: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.unitNumber, unitNumber));
    return customer;
  }
  
  async getAllCustomers(page: number = 1, limit: number = 10, sortBy?: string, sortOrder?: 'asc' | 'desc') {
    const offset = (page - 1) * limit;
    // Only allow sorting by known columns
    const sortMap = {
      unitNumber: customers.unitNumber,
      ownerName: customers.ownerName,
      tenantName: customers.tenantName,
      updatedAt: customers.updatedAt,
      createdAt: customers.createdAt,
      id: customers.id
    };
    let orderField = sortMap[sortBy as keyof typeof sortMap] || customers.unitNumber;
    const orderFn = sortOrder === 'desc' ? desc(orderField) : orderField;
    const customersList = await db.select().from(customers)
      .orderBy(orderFn)
      .limit(limit)
      .offset(offset);
    const [countResult] = await db.select({ count: sql`count(*)` }).from(customers);
    return {
      customers: customersList,
      total: Number(countResult.count)
    };
  }
  
  async searchCustomers(query: string): Promise<Customer[]> {
    return db.select().from(customers)
      .where(
        or(
          like(customers.unitNumber, `%${query}%`),
          like(customers.ownerName, `%${query}%`),
          like(customers.ownerEmail, `%${query}%`),
          like(customers.tenantName || '', `%${query}%`),
          like(customers.tenantEmail || '', `%${query}%`),
          like(customers.phone || '', `%${query}%`)
        )
      )
      .orderBy(customers.unitNumber);
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers)
      .values({
        ...customer,
        updatedAt: new Date()
      })
      .returning();
      
    return newCustomer;
  }
  
  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db.update(customers)
      .set({
        ...customer,
        updatedAt: new Date()
      })
      .where(eq(customers.id, id))
      .returning();
      
    return updatedCustomer;
  }
  
  // Violation category operations
  async getViolationCategory(id: number): Promise<ViolationCategory | undefined> {
    const [category] = await db.select().from(violationCategories).where(eq(violationCategories.id, id));
    return category;
  }
  
  async getAllViolationCategories(activeOnly: boolean = false): Promise<ViolationCategory[]> {
    if (activeOnly) {
      return db.select().from(violationCategories).where(eq(violationCategories.active, true)).orderBy(violationCategories.name);
    }
    return db.select().from(violationCategories).orderBy(violationCategories.name);
  }
  
  async createViolationCategory(category: InsertViolationCategory): Promise<ViolationCategory> {
    const [newCategory] = await db.insert(violationCategories)
      .values({
        ...category,
        updatedAt: new Date()
      })
      .returning();
      
    return newCategory;
  }
  
  async updateViolationCategory(id: number, category: Partial<InsertViolationCategory>): Promise<ViolationCategory | undefined> {
    try {
      const [updatedCategory] = await db.update(violationCategories)
        .set({ ...category, updatedAt: new Date() })
        .where(eq(violationCategories.id, id))
        .returning();
      return updatedCategory;
    } catch (error) {
      logger.error(`Error updating violation category ${id}:`, error);
      return undefined;
    }
  }

  async deleteViolationCategory(id: number): Promise<boolean> {
    try {
      const result = await db.delete(violationCategories).where(eq(violationCategories.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (e: unknown) {
      logger.error(`Error deleting violation category ${id}:`, e);
      const error = e as { code?: string }; // Type assertion
      if (error.code === '23503') { 
        throw new Error('Cannot delete category as it is currently associated with existing violations.');
      }
      return false;
    }
  }
  
  // System settings operations
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, key));
    return setting;
  }
  
  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return db.select().from(systemSettings).orderBy(systemSettings.settingKey);
  }
  
  async updateSystemSetting(key: string, value: string, userId: string): Promise<SystemSetting> {
    const [setting] = await db
      .insert(systemSettings)
      .values({ settingKey: key, settingValue: value, updatedById: userId })
      .onConflictDoUpdate({ target: systemSettings.settingKey, set: { settingValue: value, updatedById: userId } })
      .returning();
    return setting;
  }

  async getUser(id: string): Promise<Profile | undefined> {
    const [user] = await db.select().from(profiles).where(eq(profiles.id, id));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<Profile | undefined> {
    const person = await db.query.persons.findFirst({
      where: eq(persons.email, email)
    });

    if (!person || !person.authUserId) {
      return undefined;
    }
    return this.getUser(person.authUserId);
  }

  async createUser(insertUser: InsertProfile): Promise<Profile> {
    const [newUser] = await db
      .insert(profiles)
      .values(insertUser)
      .returning();
    return newUser;
  }

  async updateUser(id: string, userData: Partial<InsertProfile>): Promise<Profile | undefined> {
    const [updatedUser] = await db.update(profiles)
      .set(userData)
      .where(eq(profiles.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(profiles).where(eq(profiles.id, id));
    return result.rowCount > 0;
  }
  
  async getAllUsers(): Promise<Profile[]> {
    return db.query.profiles.findMany({
      orderBy: [desc(profiles.updatedAt)],
    });
  }

  async getPropertyUnit(id: number): Promise<PropertyUnit | undefined> {
    const [unit] = await db.select().from(propertyUnits).where(eq(propertyUnits.id, id));
    return unit;
  }

  async getPropertyUnitByUnitNumber(unitNumber: string): Promise<PropertyUnit | undefined> {
    const [unit] = await db.select().from(propertyUnits).where(eq(propertyUnits.unitNumber, unitNumber));
    return unit;
  }

  async getAllPropertyUnits(): Promise<PropertyUnit[]> {
    return db.select().from(propertyUnits).orderBy(propertyUnits.unitNumber);
  }

  async createPropertyUnit(unit: InsertPropertyUnit): Promise<PropertyUnit> {
    const [newUnit] = await db.insert(propertyUnits).values(unit).returning();
    return newUnit;
  }

  async updatePropertyUnit(id: number, unit: Partial<InsertPropertyUnit>): Promise<PropertyUnit | undefined> {
    const [updatedUnit] = await db
      .update(propertyUnits)
      .set(unit)
      .where(eq(propertyUnits.id, id))
      .returning();
    return updatedUnit;
  }

  async getViolation(id: number): Promise<Violation | undefined> {
    const [violation] = await db.select().from(violations).where(eq(violations.id, id));
    return violation;
  }
  
  async getViolationByReference(referenceNumber: string): Promise<Violation | undefined> {
    const [violation] = await db.select().from(violations).where(eq(violations.referenceNumber, referenceNumber));
    return violation;
  }

  async getViolationWithUnit(id: number): Promise<(Violation & { unit: PropertyUnit & { ownerName?: string | null, ownerEmail?: string | null, tenantName?: string | null, tenantEmail?: string | null } }) | undefined> {
    const result = await db
      .select({
        violation: violations,
        unit: propertyUnits
      })
      .from(violations)
      .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
      .where(eq(violations.id, id));
      
    if (result.length === 0) {
      return undefined;
    }
    
    const violationData = result[0].violation;
    const unitData = result[0].unit;

    // Fetch persons associated with this unit
    const unitPersons = await db
      .select({
        person: persons,
        role: unitPersonRoles.role
      })
      .from(unitPersonRoles)
      .innerJoin(persons, eq(unitPersonRoles.personId, persons.id))
      .where(eq(unitPersonRoles.unitId, unitData.id));

    let ownerName: string | null = null; 
    let ownerEmail: string | null = null; 
    let tenantName: string | null = null; 
    let tenantEmail: string | null = null;

    for (const up of unitPersons) {
      if (up.role === 'owner') {
        ownerName = up.person.fullName;
        ownerEmail = up.person.email;
      } else if (up.role === 'tenant') {
        tenantName = up.person.fullName;
        tenantEmail = up.person.email;
      }
    }
    
    return {
      ...violationData,
      unit: {
        ...unitData,
        ownerName: ownerName,
        ownerEmail: ownerEmail,
        tenantName: tenantName,
        tenantEmail: tenantEmail
      }
    };
  }
  
  async getViolationWithUnitByUuid(uuid: string): Promise<(Violation & { unit: PropertyUnit & { ownerName?: string | null, ownerEmail?: string | null, tenantName?: string | null, tenantEmail?: string | null } }) | undefined> {
    const result = await db
      .select({
        violation: violations,
        unit: propertyUnits
      })
      .from(violations)
      .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
      .where(eq(violations.uuid, uuid));
      
    if (result.length === 0) {
      return undefined;
    }
    
    const violationData = result[0].violation;
    const unitData = result[0].unit;

    // Fetch persons associated with this unit
    const unitPersons = await db
      .select({
        person: persons,
        role: unitPersonRoles.role
      })
      .from(unitPersonRoles)
      .innerJoin(persons, eq(unitPersonRoles.personId, persons.id))
      .where(eq(unitPersonRoles.unitId, unitData.id));

    let ownerName: string | null = null; 
    let ownerEmail: string | null = null; 
    let tenantName: string | null = null; 
    let tenantEmail: string | null = null;

    for (const up of unitPersons) {
      if (up.role === 'owner') {
        ownerName = up.person.fullName;
        ownerEmail = up.person.email;
      } else if (up.role === 'tenant') {
        tenantName = up.person.fullName;
        tenantEmail = up.person.email;
      }
    }
    
    return {
      ...violationData,
      unit: {
        ...unitData,
        ownerName: ownerName,
        ownerEmail: ownerEmail,
        tenantName: tenantName,
        tenantEmail: tenantEmail
      }
    };
  }
  
  async getAllViolations(): Promise<(Violation & { unit: PropertyUnit })[]> {
    const result = await db
      .select({
        violation: violations,
        unit: propertyUnits
      })
      .from(violations)
      .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
      .orderBy(desc(violations.createdAt));
    
    return result.map((r: { violation: Violation; unit: PropertyUnit }) => ({
      ...r.violation,
      unit: r.unit
    }));
  }
  
  async getViolationsByStatus(status: ViolationStatus): Promise<(Violation & { unit: PropertyUnit })[]> {
    try {
      const result = await db
        .select({
          violation: violations,
          unit: propertyUnits
        })
        .from(violations)
        .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
        .where(eq(violations.status, status))
        .orderBy(desc(violations.createdAt));
    
      return result.map((r: { violation: Violation; unit: PropertyUnit }) => ({
        ...r.violation,
        unit: r.unit
      }));
    } catch (error) {
      console.error(`[ERROR_DB] Failed to getViolationsByStatus for status "${status}":`, error);
      throw error;
    }
  }
  
  async getViolationsByUnit(unitId: number): Promise<Violation[]> {
    return db
      .select()
      .from(violations)
      .where(eq(violations.unitId, unitId))
      .orderBy(desc(violations.createdAt));
  }
  
  async getViolationsByReporter(userId: string): Promise<Violation[]> {
    return db.query.violations.findMany({
      where: eq(violations.reportedById, userId),
      orderBy: [desc(violations.createdAt)],
    });
  }
  
  async getViolationsByCategory(categoryId: number): Promise<Violation[]> {
    return db
      .select()
      .from(violations)
      .where(eq(violations.categoryId, categoryId))
      .orderBy(desc(violations.createdAt));
  }
  
  async getRecentViolations(limit: number): Promise<(Violation & { unit: PropertyUnit })[]> {
    const result = await db
      .select({
        violation: violations,
        unit: propertyUnits
      })
      .from(violations)
      .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
      .orderBy(desc(violations.createdAt))
      .limit(limit);
      
    return result.map((r: { violation: Violation; unit: PropertyUnit }) => ({
      ...r.violation,
      unit: r.unit
    }));
  }
  
  async createViolation(violation: InsertViolation): Promise<Violation> {
    console.log("[DB] createViolation called with attachments:", violation.attachments);
    const [newViolation] = await db
      .insert(violations)
      .values({
        ...violation,
        attachments: Array.isArray(violation.attachments) ? Array.from(violation.attachments).filter((a): a is string => typeof a === 'string') : [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    console.log("[DB] createViolation inserted attachments:", newViolation.attachments);
    return newViolation;
  }
  
  async updateViolation(id: number, violation: Partial<InsertViolation>): Promise<Violation | undefined> {
    const [updatedViolation] = await db
      .update(violations)
      .set({
        ...violation,
        attachments: Array.isArray(violation.attachments) ? Array.from(violation.attachments).filter((a): a is string => typeof a === 'string') : [],
        updatedAt: new Date()
      })
      .where(eq(violations.id, id))
      .returning();
      
    return updatedViolation;
  }
  
  async updateViolationStatus(id: number, status: ViolationStatus): Promise<Violation | undefined> {
    const [updatedViolation] = await db
      .update(violations)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(violations.id, id))
      .returning();
      
    return updatedViolation;
  }
  
  async updateViolationStatusByUuid(uuid: string, status: ViolationStatus): Promise<Violation | undefined> {
    const [updatedViolation] = await db
      .update(violations)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(violations.uuid, uuid))
      .returning();
      
    return updatedViolation;
  }
  
  async setViolationFine(id: number, amount: number): Promise<Violation | undefined> {
    const [updatedViolation] = await db
      .update(violations)
      .set({
        fineAmount: amount,
        updatedAt: new Date()
      })
      .where(eq(violations.id, id))
      .returning();
      
    return updatedViolation;
  }
  
  async setViolationFineByUuid(uuid: string, amount: number): Promise<Violation | undefined> {
    const [updatedViolation] = await db
      .update(violations)
      .set({
        fineAmount: amount,
        updatedAt: new Date()
      })
      .where(eq(violations.uuid, uuid))
      .returning();
      
    return updatedViolation;
  }
  
  async generateViolationPdf(id: number, pdfPath: string): Promise<Violation | undefined> {
    const violation = await this.getViolation(id);
    
    if (!violation) {
      return undefined;
    }
    
    const [updatedViolation] = await db
      .update(violations)
      .set({
        pdfPath,
        updatedAt: new Date()
      })
      .where(eq(violations.id, id))
      .returning();
      
    return updatedViolation;
  }
  
  // Violation history operations
  async getViolationHistory(violationId: number): Promise<ViolationHistoryWithUser[]> {
    const history = await db.select({
      id: violationHistories.id,
      violationId: violationHistories.violationId,
      userId: violationHistories.userId,
      status: violationHistories.status,
      rejectionReason: violationHistories.rejectionReason,
      createdAt: violationHistories.createdAt,
      details: violationHistories.details,
      userFullName: profiles.fullName,
    })
    .from(violationHistories)
    .leftJoin(profiles, eq(violationHistories.userId, profiles.id))
    .where(eq(violationHistories.violationId, violationId))
    .orderBy(desc(violationHistories.createdAt));

    return history;
  }
  
  async addViolationHistory(history: InsertViolationHistory): Promise<ViolationHistory> {
    // Get the violation UUID for the given violation ID
    const violation = await this.getViolation(history.violationId);
    
    const [newHistory] = await db
      .insert(violationHistories)
      .values({
        ...history,
        violationUuid: violation?.uuid, // Populate UUID if available
        createdAt: new Date()
      })
      .returning();
      
    return newHistory;
  }
  
  // Reporting operations
  async getRepeatViolations(minCount: number): Promise<{ unitId: number, unitNumber: string, count: number, lastViolationDate: Date }[]> {
    const result = await db
      .select({
        unitId: violations.unitId,
        count: sql<number>`count(*)`,
        lastViolation: sql<Date>`max(${violations.createdAt})`
      })
      .from(violations)
      .groupBy(violations.unitId)
      .having(sql`count(*) >= ${minCount}`);
      
    // Get unit numbers for each unit ID
    const unitIds = result.map(r => r.unitId as number);
    
    if (unitIds.length === 0) {
      return [];
    }
    
    const units = await db
      .select({
        id: propertyUnits.id,
        unitNumber: propertyUnits.unitNumber
      })
      .from(propertyUnits)
      .where(
        or(...unitIds.map((id: number) => eq(propertyUnits.id, id)))
      );
    
    // Create a map of unit IDs to unit numbers
    const unitMap = new Map<number, string>();
    units.forEach((unit: { id: number; unitNumber: string }) => {
      unitMap.set(unit.id, unit.unitNumber);
    });
    
    // Create the final result
    return result.map((r: { unitId: number; count: number | string; lastViolation: Date }) => ({
      unitId: r.unitId,
      unitNumber: unitMap.get(r.unitId) || 'Unknown',
      count: Number(r.count),
      lastViolationDate: r.lastViolation
    })).sort((a: { count: number }, b: { count: number }) => b.count - a.count);
  }
  
  async getViolationStats(filters: { from?: Date, to?: Date, categoryId?: number } = {}): Promise<{
    totalViolations: number,
    newViolations: number,
    pendingViolations: number,
    approvedViolations: number,
    disputedViolations: number,
    rejectedViolations: number,
    resolvedViolations: number,
    averageResolutionTimeDays: number | null
  }> {
    try {
      console.log('[getViolationStats] Starting with filters:', filters);
      
      const { from, to, categoryId } = filters;
      const conditions: SQL[] = [];
      if (from) conditions.push(gte(violations.createdAt, from));
      if (to) conditions.push(lte(violations.createdAt, to));
      if (categoryId) conditions.push(eq(violations.categoryId, categoryId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      console.log('[getViolationStats] Conditions count:', conditions.length);

      // First, let's check if we have any violations at all
      const totalCount = await db
        .select({ count: drizzleCount() })
        .from(violations);
      console.log('[getViolationStats] Total violations in database:', totalCount[0]?.count || 0);

      if (!totalCount[0]?.count || totalCount[0].count === 0) {
        console.log('[getViolationStats] No violations found, returning zero stats');
        return {
          totalViolations: 0,
          newViolations: 0,
          pendingViolations: 0,
          approvedViolations: 0,
          disputedViolations: 0,
          rejectedViolations: 0,
          resolvedViolations: 0,
          averageResolutionTimeDays: null
        };
      }

      console.log('[getViolationStats] Executing main stats query...');
      const [counts] = await db
        .select({
          total: drizzleCount(),
          new: sql<number>`SUM(CASE WHEN ${violations.status} = 'new' THEN 1 ELSE 0 END)`,
          pending: sql<number>`SUM(CASE WHEN ${violations.status} = 'pending_approval' THEN 1 ELSE 0 END)`,
          approved: sql<number>`SUM(CASE WHEN ${violations.status} = 'approved' THEN 1 ELSE 0 END)`,
          disputed: sql<number>`SUM(CASE WHEN ${violations.status} = 'disputed' THEN 1 ELSE 0 END)`,
          rejected: sql<number>`SUM(CASE WHEN ${violations.status} = 'rejected' THEN 1 ELSE 0 END)`,
          resolved: sql<number>`SUM(CASE WHEN ${violations.status} = 'resolved' THEN 1 ELSE 0 END)`
        })
        .from(violations)
        .where(whereClause);

      console.log('[getViolationStats] Raw counts result:', counts);

      // Calculate average resolution time
      console.log('[getViolationStats] Calculating resolution time...');
      const resolvedViolationsData = await db
        .select({
          createdAt: violations.createdAt,
          updatedAt: violations.updatedAt 
        })
        .from(violations)
        .where(whereClause ? and(whereClause, eq(violations.status, 'resolved')) : eq(violations.status, 'resolved'));

      let totalResolutionTimeMs = 0;
      resolvedViolationsData.forEach((v: { createdAt?: Date; updatedAt?: Date }) => {
        if (v.createdAt && v.updatedAt) {
          totalResolutionTimeMs += v.updatedAt.getTime() - v.createdAt.getTime();
        }
      });
      
      const averageResolutionTimeDays = resolvedViolationsData.length > 0 
        ? (totalResolutionTimeMs / resolvedViolationsData.length) / (1000 * 60 * 60 * 24) 
        : null;

      const result = {
        totalViolations: Number(counts?.total) || 0,
        newViolations: Number(counts?.new) || 0,
        pendingViolations: Number(counts?.pending) || 0,
        approvedViolations: Number(counts?.approved) || 0,
        disputedViolations: Number(counts?.disputed) || 0,
        rejectedViolations: Number(counts?.rejected) || 0,
        resolvedViolations: Number(counts?.resolved) || 0,
        averageResolutionTimeDays: averageResolutionTimeDays !== null ? parseFloat(averageResolutionTimeDays.toFixed(1)) : null
      };

      console.log('[getViolationStats] Final result:', result);
      return result;
    } catch (error) {
      console.error('[getViolationStats] Error occurred:', error);
      throw error;
    }
  }
  
  async getViolationsByMonth(filters: { from?: Date, to?: Date, categoryId?: number } = {}): Promise<{ month: string, count: number }[]> {
    const { from, to, categoryId } = filters;
    const conditions = [];
    
    // Date range for query
    let queryFromDate = from;
    let queryToDate = to;

    if (!queryFromDate && !queryToDate) {
      // Default to current year if no dates are provided
      const now = new Date();
      queryFromDate = new Date(now.getFullYear(), 0, 1); // Start of current year
      queryToDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); // End of current year
    } else if (queryFromDate && !queryToDate) {
      // If only from is provided, set to to end of that year or sensible default
      queryToDate = new Date(queryFromDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (!queryFromDate && queryToDate) {
      // If only to is provided, set from to start of that year or sensible default
      queryFromDate = new Date(queryToDate.getFullYear(), 0, 1);
    }


    if (queryFromDate) conditions.push(gte(violations.createdAt, queryFromDate));
    if (queryToDate) conditions.push(lte(violations.createdAt, queryToDate));
    if (categoryId) conditions.push(eq(violations.categoryId, categoryId));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Group by YYYY-MM
    const violationsByMonthRaw = await db.select({
      yearMonth: sql<string>`TO_CHAR(${violations.createdAt}, 'YYYY-MM')`,
      count: drizzleCount(sql`*`)
    })
    .from(violations)
    .where(whereClause)
    .groupBy(sql`TO_CHAR(${violations.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${violations.createdAt}, 'YYYY-MM')`);

    // Ensure all months within the range are represented, even if count is 0
    const result: { month: string, count: number }[] = [];
    if (queryFromDate && queryToDate) {
      let currentDate = new Date(queryFromDate.getFullYear(), queryFromDate.getMonth(), 1);
      const finalDate = new Date(queryToDate.getFullYear(), queryToDate.getMonth(), 1);

      while (currentDate <= finalDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
        const yearMonthStr = `${year}-${month.toString().padStart(2, '0')}`;
        
        const monthData = violationsByMonthRaw.find(v => v.yearMonth === yearMonthStr);
        result.push({ month: yearMonthStr, count: monthData ? Number(monthData.count) : 0 });
        
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    } else {
       // Fallback for cases where date range might not be perfectly defined (should ideally not happen with new defaults)
       violationsByMonthRaw.forEach(item => {
        result.push({ month: item.yearMonth, count: Number(item.count) });
       });
    }
    
    return result;
  }

  async getViolationsByType(filters: { from?: Date, to?: Date, categoryId?: number } = {}): Promise<{ type: string, count: number }[]> {
    const { from, to, categoryId } = filters;
    const conditions: SQL[] = [];
    if (from) conditions.push(gte(violations.createdAt, from));
    if (to) conditions.push(lte(violations.createdAt, to));
    if (categoryId) conditions.push(eq(violations.categoryId, categoryId));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db.select({
      type: violationCategories.name,
      count: drizzleCount(sql`*`)
    })
    .from(violations)
    .leftJoin(violationCategories, eq(violations.categoryId, violationCategories.id))
    .where(whereClause)
    .groupBy(violationCategories.name)
    .orderBy(desc(drizzleCount(sql`*`)));

    return result.map((r: { type: string | null; count: number | string }) => ({ 
      type: r.type ?? 'Unknown', // Ensure type is always string
      count: Number(r.count) 
    }));
  }
  
  async getFilteredViolationsForReport(filters: { from?: Date, to?: Date, categoryId?: number } = {}): Promise<(Violation & { unit: PropertyUnit, category?: ViolationCategory })[]> {
    const { from, to, categoryId } = filters;
    const conditions: SQL[] = [];

    if (from) conditions.push(gte(violations.createdAt, from));
    if (to) conditions.push(lte(violations.createdAt, to));
    if (categoryId) conditions.push(eq(violations.categoryId, categoryId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        violation: violations,
        unit: propertyUnits,
        category: violationCategories
      })
      .from(violations)
      .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
      .leftJoin(violationCategories, eq(violations.categoryId, violationCategories.id))
      .where(whereClause)
      .orderBy(desc(violations.createdAt)); // Or any other order suitable for the report
    
    return result.map((r: { violation: Violation; unit: PropertyUnit; category: ViolationCategory | null }) => ({
      ...r.violation,
      unit: r.unit,
      category: r.category || undefined // Handle cases where category might be null
    }));
  }
  
  async getViolationsPaginated(page: number = 1, limit: number = 20, status?: string, unitId?: number, sortBy?: string, sortOrder?: 'asc' | 'desc') {
    const offset = (page - 1) * limit;
    // Only allow sorting by known columns
    const sortMap = {
      createdAt: violations.createdAt,
      violationType: violations.violationType,
      status: violations.status,
      fineAmount: violations.fineAmount,
      unitNumber: propertyUnits.unitNumber,
      id: violations.id
    };
    let orderField = sortMap[sortBy as keyof typeof sortMap] || violations.createdAt;
    const orderFn = sortOrder === 'asc' ? asc(orderField) : desc(orderField);
    let whereClause = [];
    if (status) whereClause.push(eq(violations.status, status));
    if (unitId) whereClause.push(eq(violations.unitId, unitId));

    const result = await db
      .select({ violation: violations, unit: propertyUnits })
      .from(violations)
      .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
      .where(whereClause.length ? and(...whereClause) : undefined)
      .orderBy(orderFn)
      .limit(limit)
      .offset(offset);

    // Count query
    const countQuery = db
      .select({ count: sql`count(*)` })
      .from(violations);

    // Only add join if it's actually needed for the where clause or future sort/filter on count
    // For now, the whereClause only pertains to the 'violations' table.
    // If sortMap included unit specific fields that were part of the 'whereClause' for count, then join.
    // Current 'whereClause' does not require a join for the count.

    if (whereClause.length > 0) {
      // If there are filters on the violations table, apply them directly.
      // If any filter in whereClause were to depend on propertyUnits, a join would be needed here.
      // Example: if (whereClause.some(condition => condition involves propertyUnits)) {
      //   countQuery.innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id));
      // }
      // For now, no join in count is strictly necessary as filters are on `violations` table.
      // However, to keep it symmetric with the main query for potential future changes or if
      // the DB optimizer benefits from identical structures:
      countQuery.innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id));
      countQuery.where(and(...whereClause));
    } else {
      // If no filters, count all violations. This can be slow.
      // Consider if a different strategy is needed for unfiltered counts on very large tables.
      // For now, keeping it simple and counting all related to the query (which has an implicit join).
      // To count all violations *without* the join (if that's ever the desired total):
      // const [{ count }] = await db.select({ count: sql`count(*)` }).from(violations);
      // But the current 'total' should reflect the items that *could* be paged through.
       countQuery.innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id));
       // No .where() clause means count all records resulting from the join
    }

    const [{ count }] = await countQuery;

    return {
      violations: result.map(r => ({ ...r.violation, unit: r.unit })),
      total: Number(count)
    };
  }

  async getAllUnitsPaginated(page: number = 1, limit: number = 20, sortBy?: string, sortOrder?: 'asc' | 'desc', search?: string) {
    throw new Error("Method not implemented.");
  }

  async createUnitWithPersons(unitData: {
    unit: InsertPropertyUnit;
    facilities: {
      parkingSpots?: string[];
      storageLockers?: string[];
      bikeLockers?: string[];
    };
    persons: Array<{
      fullName: string;
      email: string;
      phone: string;
      role: 'owner' | 'tenant';
      receiveEmailNotifications: boolean;
      hasCat?: boolean;
      hasDog?: boolean;
    }>;
  }): Promise<{
    unit: PropertyUnit;
    facilities: {
      parkingSpots: ParkingSpot[];
      storageLockers: StorageLocker[];
      bikeLockers: BikeLocker[];
    };
    persons: (Person & { role: string; receiveEmailNotifications: boolean })[];
  }> {
    const { unit, facilities, persons } = unitData;

    // Start a transaction
    const [tx] = await db.transaction(async (tx) => {
      // Insert the unit
      const [newUnit] = await tx
        .insert(propertyUnits)
        .values(unit)
        .returning();

      // Insert facilities
      const newFacilities = {
        parkingSpots: [],
        storageLockers: [],
        bikeLockers: [],
      };

      if (facilities.parkingSpots) {
        newFacilities.parkingSpots = await tx
          .insert(parkingSpots)
          .values(
            facilities.parkingSpots.map((spot) => ({
              unitId: newUnit.id,
              spotNumber: spot,
            }))
          )
          .returning();
      }

      if (facilities.storageLockers) {
        newFacilities.storageLockers = await tx
          .insert(storageLockers)
          .values(
            facilities.storageLockers.map((locker) => ({
              unitId: newUnit.id,
              lockerNumber: locker,
            }))
          )
          .returning();
      }

      if (facilities.bikeLockers) {
        newFacilities.bikeLockers = await tx
          .insert(bikeLockers)
          .values(
            facilities.bikeLockers.map((locker) => ({
              unitId: newUnit.id,
              lockerNumber: locker,
            }))
          )
          .returning();
      }

      // Insert persons and their roles
      const newPersons: (Person & { role: string; receiveEmailNotifications: boolean })[] = [];

      for (const person of persons) {
        const [newPerson] = await tx
          .insert(persons)
          .values({
            fullName: person.fullName,
            email: person.email,
            phone: person.phone,
            hasCat: person.hasCat,
            hasDog: person.hasDog,
          })
          .returning();

        await tx
          .insert(unitPersonRoles)
          .values({
            unitId: newUnit.id,
            personId: newPerson.id,
            role: person.role,
            receiveEmailNotifications: person.receiveEmailNotifications,
          })
          .returning();

        newPersons.push({
          ...newPerson,
          role: person.role,
          receiveEmailNotifications: person.receiveEmailNotifications,
        });
      }

      return {
        unit: newUnit,
        facilities: newFacilities,
        persons: newPersons,
      };
    });

    return tx;
  }

  async getPendingApprovalViolations(userId: string): Promise<(Violation & { unit: PropertyUnit })[]> {
    const result = await db.query.violations.findMany({
      where: and(
        eq(violations.status, 'pending_approval'),
        eq(violations.reportedById, userId)
      ),
      with: {
        unit: true,
      },
      orderBy: [desc(violations.createdAt)],
    });
    return result;
  }

  async getPersonsWithRolesForUnit(unitId: number): Promise<Array<{
    personId: number;
    fullName: string;
    email: string;
    role: string;
    receiveEmailNotifications: boolean;
  }>> {
    const result = await db
      .select({
        personId: persons.id,
        fullName: persons.fullName,
        email: persons.email,
        role: unitPersonRoles.role,
        receiveEmailNotifications: unitPersonRoles.receiveEmailNotifications
      })
      .from(persons)
      .innerJoin(unitPersonRoles, eq(persons.id, unitPersonRoles.personId))
      .where(eq(unitPersonRoles.unitId, unitId));
    
    return result;
  }

  async createViolationAccessLink(data: {
    violationId: number;
    violationUuid: string;
    recipientEmail: string;
    expiresInDays?: number;
  }): Promise<string | null> {
    throw new Error("Method not implemented.");
  }

  async getAdminAndCouncilUsers(): Promise<Array<{
    id: string;
    email: string;
    fullName: string | null;
  }>> {
    try {
      const results = await db
        .select({
          id: profiles.id,
          fullName: profiles.fullName,
          email: persons.email,
        })
        .from(profiles)
        .leftJoin(persons, eq(profiles.id, persons.authUserId))
        .where(
          or(
            eq(profiles.role, 'admin'),
            eq(profiles.role, 'council')
          )
        );
      
      return results.map(r => ({ ...r, email: r.email || '' }));
    } catch (error) {
      logger.error("Error fetching admin and council users:", error);
      throw new Error("Could not fetch admin and council users.");
    }
  }

  async addEmailVerificationCode(params: { personId: number, violationId: number, codeHash: string, expiresAt: Date }) {
    const { personId, violationId, codeHash, expiresAt } = params;
    
    const [newCode] = await db
      .insert(emailVerificationCodes)
      .values({
        personId,
        violationId,
        codeHash,
        expiresAt
      })
      .returning();
    
    return newCode;
  }

  async getEmailVerificationCode(personId: number, violationId: number, codeHash: string) {
    const [code] = await db
      .select()
      .from(emailVerificationCodes)
      .where(
        and(
          eq(emailVerificationCodes.personId, personId),
          eq(emailVerificationCodes.violationId, violationId),
          eq(emailVerificationCodes.codeHash, codeHash),
          gt(emailVerificationCodes.expiresAt, new Date())
        )
      );
    
    return code;
  }

  async getMonthlyFines(filters?: { from?: Date, to?: Date, categoryId?: number }): Promise<{ month: string, totalFines: number }[]> {
    throw new Error("Method not implemented.");
  }

  async updateUnitWithPersonsAndFacilities(
    unitId: number,
    unitData: Partial<InsertPropertyUnit>,
    personsData: Array<{ id?: number; fullName: string; email: string; phone?: string; role: 'owner' | 'tenant'; receiveEmailNotifications: boolean }>,
    facilitiesData: { parkingSpots?: string[]; storageLockers?: string[]; bikeLockers?: string[] }
  ): Promise<{ unit: PropertyUnit; persons: Person[]; roles: UnitPersonRole[]; facilities: any }> {
    throw new Error("Method not implemented.");
  }

  async createPublicUserSession(data: {
    personId: number;
    unitId: number;
    email: string;
    role: string;
    expiresInHours?: number;
  }): Promise<any> {
    throw new Error("Method not implemented.");
  }

  async getPublicUserSession(sessionId: string): Promise<any> {
    throw new Error("Method not implemented.");
  }

  async getViolationsForUnit(unitId: number, includeStatuses?: string[]): Promise<any[]> {
    throw new Error("Method not implemented.");
  }

  async expirePublicUserSession(sessionId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

export const storage = new DatabaseStorage();