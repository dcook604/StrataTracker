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
  type Violation,
  type InsertViolation,
  type ViolationHistory,
  type InsertViolationHistory,
  type ViolationStatus,
  unitPersonRoles,
  type Person,
  type UnitPersonRole,
  violationAccessLinks,
  type ViolationAccessLink,
  parkingSpots,
  storageLockers,
  bikeLockers,
  type ParkingSpot,
  type StorageLocker,
  type BikeLocker,
  emailVerificationCodes,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, like, or, gte, lte, asc, SQL, Name, inArray, gt } from "drizzle-orm";
import logger from './utils/logger';
import session from 'express-session';

// @ts-expect-error connect-pg-simple package lacks proper TypeScript definitions
import connectPgSimple from 'connect-pg-simple';


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

  getViolationAccessLinkByToken(token: string): Promise<ViolationAccessLink | undefined>;
  markViolationAccessLinkUsed(id: number): Promise<void>;

  deleteViolation(id: number): Promise<boolean>;
  deleteViolationByUuid(uuid: string): Promise<boolean>;
  deleteUnit(id: number): Promise<boolean>;
  getUnitWithPersonsAndFacilities(id: number): Promise<{ unit: PropertyUnit; persons: (Person & { role: string; receiveEmailNotifications: boolean })[]; facilities: { parkingSpots: ParkingSpot[], storageLockers: StorageLocker[], bikeLockers: BikeLocker[] }; violationCount: number; violations: { id: number; referenceNumber: string; violationType: string; status: string; createdAt: Date; }[] } | undefined>;
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
  getEmailVerificationCode(personId: number, violationId: number, codeHash: string): Promise<{ id: number; usedAt?: Date } | null>;
  markEmailVerificationCodeUsed(id: number): Promise<void>;

  getMonthlyFines(filters?: { from?: Date, to?: Date, categoryId?: number }): Promise<{ month: string, totalFines: number }[]>;

  updateUnitWithPersonsAndFacilities(
    unitId: number,
    unitData: Partial<InsertPropertyUnit>,
    personsData: Array<{ id?: number; fullName: string; email: string; phone?: string; role: 'owner' | 'tenant'; receiveEmailNotifications: boolean }>,
    facilitiesData: { parkingSpots?: string[]; storageLockers?: string[]; bikeLockers?: string[] }
  ): Promise<{ unit: PropertyUnit; persons: Person[]; roles: UnitPersonRole[]; facilities: any }>;

  createPublicUserSession(data: {
    personId: number;
    unitId: number;
    email: string;
    role: string;
    expiresInHours?: number;
  }): Promise<{ sessionId: string; expiresAt: Date }>;

  getPublicUserSession(sessionId: string): Promise<{ unitId: number; expiresAt: Date } | null>;

  getViolationsForUnit(unitId: number, includeStatuses?: string[]): Promise<Violation[]>;

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
      pool: (db as { pool?: unknown }).pool, // Use the exported pool from db.ts
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
    const sortMap = {
      unitNumber: customers.unitNumber,
      ownerName: customers.ownerName,
      tenantName: customers.tenantName,
      updatedAt: customers.updatedAt,
      createdAt: customers.createdAt,
      id: customers.id
    };
    const orderField = sortMap[sortBy as keyof typeof sortMap] || customers.unitNumber;
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
      const error = e as { code?: string };
      if (error.code === '23503') { 
        throw new Error('Cannot delete category as it is currently associated with existing violations.');
      }
      return false;
    }
  }
  
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
    const [person] = await db.select().from(persons).where(eq(persons.email, email));
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
    return (result.rowCount ?? 0) > 0;
  }
  
  async getAllUsers(): Promise<Profile[]> {
    return db.select().from(profiles).orderBy(desc(profiles.updatedAt));
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
    
    return result.map((r) => ({
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
    
      return result.map((r) => ({
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
    return db
      .select()
      .from(violations)
      .where(eq(violations.reportedById, userId))
      .orderBy(desc(violations.createdAt));
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
      
    return result.map((r) => ({
      ...r.violation,
      unit: r.unit
    }));
  }
  
  async createViolation(violation: InsertViolation): Promise<Violation> {
    const [newViolation] = await db
      .insert(violations)
      .values({
        ...violation,
        attachments: Array.isArray(violation.attachments) ? Array.from(violation.attachments).filter((a): a is string => typeof a === 'string') : [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
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
  
  async getViolationHistory(violationId: number): Promise<ViolationHistoryWithUser[]> {
    const history = await db.select({
      id: violationHistories.id,
      violationId: violationHistories.violationId,
      userId: violationHistories.userId,
      action: violationHistories.action,
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
    if (history.violationId === null || history.violationId === undefined) {
      throw new Error("Cannot add history without a violationId");
    }
    
    const [newHistory] = await db
      .insert(violationHistories)
      .values({
        ...history,
        createdAt: new Date()
      })
      .returning();
      
    return newHistory;
  }
  
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
      
    const unitIds = result.map(r => r.unitId as number).filter(id => id !== null);
    
    if (unitIds.length === 0) {
      return [];
    }
    
    const units = await db
      .select({
        id: propertyUnits.id,
        unitNumber: propertyUnits.unitNumber
      })
      .from(propertyUnits)
      .where(inArray(propertyUnits.id, unitIds));
    
    const unitMap = new Map<number, string>();
    units.forEach((unit) => {
      unitMap.set(unit.id, unit.unitNumber);
    });
    
    return result.map((r) => ({
      unitId: r.unitId as number,
      unitNumber: unitMap.get(r.unitId as number) || 'Unknown',
      count: Number(r.count),
      lastViolationDate: r.lastViolation
    })).sort((a, b) => b.count - a.count);
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
      const { from, to, categoryId } = filters;
      const conditions: SQL[] = [];
      if (from) conditions.push(gte(violations.createdAt, from));
      if (to) conditions.push(lte(violations.createdAt, to));
      if (categoryId) conditions.push(eq(violations.categoryId, categoryId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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

      const resolvedViolationsData = await db
        .select({
          createdAt: violations.createdAt,
          updatedAt: violations.updatedAt 
        })
        .from(violations)
        .where(whereClause ? and(whereClause, eq(violations.status, 'resolved')) : eq(violations.status, 'resolved'));

      let totalResolutionTimeMs = 0;
      resolvedViolationsData.forEach((v) => {
        if (v.createdAt && v.updatedAt) {
          totalResolutionTimeMs += v.updatedAt.getTime() - v.createdAt.getTime();
        }
      });
      
      const averageResolutionTimeDays = resolvedViolationsData.length > 0 
        ? (totalResolutionTimeMs / resolvedViolationsData.length) / (1000 * 60 * 60 * 24) 
        : null;

      return {
        totalViolations: Number(counts?.total) || 0,
        newViolations: Number(counts?.new) || 0,
        pendingViolations: Number(counts?.pending) || 0,
        approvedViolations: Number(counts?.approved) || 0,
        disputedViolations: Number(counts?.disputed) || 0,
        rejectedViolations: Number(counts?.rejected) || 0,
        resolvedViolations: Number(counts?.resolved) || 0,
        averageResolutionTimeDays: averageResolutionTimeDays !== null ? parseFloat(averageResolutionTimeDays.toFixed(1)) : null
      };
  }
  
  async getViolationsByMonth(filters: { from?: Date, to?: Date, categoryId?: number } = {}): Promise<{ month: string, count: number }[]> {
    const { from, to, categoryId } = filters;
    const conditions: SQL[] = [];
    
    let queryFromDate = from;
    let queryToDate = to;

    if (!queryFromDate || !queryToDate) {
      const now = new Date();
      queryFromDate = queryFromDate || new Date(now.getFullYear(), 0, 1);
      queryToDate = queryToDate || new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    if (queryFromDate) conditions.push(gte(violations.createdAt, queryFromDate));
    if (queryToDate) conditions.push(lte(violations.createdAt, queryToDate));
    if (categoryId) conditions.push(eq(violations.categoryId, categoryId));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const violationsByMonthRaw = await db.select({
      yearMonth: sql<string>`TO_CHAR(${violations.createdAt}, 'YYYY-MM')`,
      count: drizzleCount()
    })
    .from(violations)
    .where(whereClause)
    .groupBy(sql`TO_CHAR(${violations.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${violations.createdAt}, 'YYYY-MM')`);

    const result: { month: string, count: number }[] = [];
    if (queryFromDate && queryToDate) {
      const currentDate = new Date(queryFromDate.getFullYear(), queryFromDate.getMonth(), 1);
      const finalDate = new Date(queryToDate.getFullYear(), queryToDate.getMonth(), 1);

      while (currentDate <= finalDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const yearMonthStr = `${year}-${month.toString().padStart(2, '0')}`;
        
        const monthData = violationsByMonthRaw.find(v => v.yearMonth === yearMonthStr);
        result.push({ month: yearMonthStr, count: monthData ? Number(monthData.count) : 0 });
        
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    } else {
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
      count: drizzleCount()
    })
    .from(violations)
    .leftJoin(violationCategories, eq(violations.categoryId, violationCategories.id))
    .where(whereClause)
    .groupBy(violationCategories.name)
    .orderBy(desc(drizzleCount()));

    return result.map((r) => ({ 
      type: r.type ?? 'Unknown',
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
      .orderBy(desc(violations.createdAt));
    
    return result.map((r) => ({
      ...r.violation,
      unit: r.unit,
      category: r.category || undefined
    }));
  }
  
  async getViolationsPaginated(page: number = 1, limit: number = 20, status?: string, unitId?: number, sortBy?: string, sortOrder?: 'asc' | 'desc') {
    const offset = (page - 1) * limit;
    const sortMap: Record<string, SQL | Name | undefined> = {
      createdAt: violations.createdAt,
      violationType: violations.violationType,
      status: violations.status,
      fineAmount: violations.fineAmount,
      unitNumber: propertyUnits.unitNumber,
      id: violations.id
    };
    const orderField = sortMap[sortBy || ''] || violations.createdAt;
    const orderFn = sortOrder === 'asc' ? asc(orderField as Name) : desc(orderField as Name);
    
    const whereConditions: SQL[] = [];
    if (status) whereConditions.push(eq(violations.status, status as ViolationStatus));
    if (unitId) whereConditions.push(eq(violations.unitId, unitId));
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const result = await db
      .select({ violation: violations, unit: propertyUnits })
      .from(violations)
      .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
      .where(whereClause)
      .orderBy(orderFn)
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ count: sql`count(*)` })
      .from(violations)
      .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
      .where(whereClause);

    const [{ count }] = await countQuery;

    return {
      violations: result.map(r => ({ ...r.violation, unit: r.unit })),
      total: Number(count)
    };
  }

  async getAllUnitsPaginated(_page: number = 1, _limit: number = 20, _sortBy?: string, _sortOrder?: 'asc' | 'desc', _search?: string): Promise<{ units: PropertyUnit[], total: number }> {
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
      phone?: string;
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
    persons: Person[];
    roles: UnitPersonRole[];
  }> {
    const { unit, facilities, persons: personsData } = unitData;

    const result = await db.transaction(async (tx) => {
      const [newUnit] = await tx
        .insert(propertyUnits)
        .values(unit)
        .returning();

      const newFacilities: {
        parkingSpots: ParkingSpot[],
        storageLockers: StorageLocker[],
        bikeLockers: BikeLocker[],
      } = {
        parkingSpots: [],
        storageLockers: [],
        bikeLockers: [],
      };

      if (facilities.parkingSpots && facilities.parkingSpots.length > 0) {
        newFacilities.parkingSpots = await tx
          .insert(parkingSpots)
          .values(
            facilities.parkingSpots.map((spot) => ({
              unitId: newUnit.id,
              identifier: spot,
            }))
          )
          .returning();
      }

      if (facilities.storageLockers && facilities.storageLockers.length > 0) {
        newFacilities.storageLockers = await tx
          .insert(storageLockers)
          .values(
            facilities.storageLockers.map((locker) => ({
              unitId: newUnit.id,
              identifier: locker,
            }))
          )
          .returning();
      }

      if (facilities.bikeLockers && facilities.bikeLockers.length > 0) {
        newFacilities.bikeLockers = await tx
          .insert(bikeLockers)
          .values(
            facilities.bikeLockers.map((locker) => ({
              unitId: newUnit.id,
              identifier: locker,
            }))
          )
          .returning();
      }

      const newPersons: Person[] = [];
      const newRoles: UnitPersonRole[] = [];

      for (const person of personsData) {
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

        const [newRole] = await tx
          .insert(unitPersonRoles)
          .values({
            unitId: newUnit.id,
            personId: newPerson.id,
            role: person.role,
            receiveEmailNotifications: person.receiveEmailNotifications,
          })
          .returning();
        
        newPersons.push(newPerson);
        newRoles.push(newRole);
      }

      return {
        unit: newUnit,
        facilities: newFacilities,
        persons: newPersons,
        roles: newRoles,
      };
    });

    return result;
  }

  async getViolationAccessLinkByToken(token: string): Promise<ViolationAccessLink | undefined> {
    const [link] = await db.select().from(violationAccessLinks).where(eq(violationAccessLinks.token, token));
    return link;
  }

  async markViolationAccessLinkUsed(id: number): Promise<void> {
    await db.update(violationAccessLinks).set({ usedAt: new Date() }).where(eq(violationAccessLinks.id, id));
  }

  async deleteViolation(id: number): Promise<boolean> {
    const result = await db.delete(violations).where(eq(violations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteViolationByUuid(uuid: string): Promise<boolean> {
    const result = await db.delete(violations).where(eq(violations.uuid, uuid));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteUnit(id: number): Promise<boolean> {
    const result = await db.delete(propertyUnits).where(eq(propertyUnits.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getUnitWithPersonsAndFacilities(_id: number): Promise<{ unit: PropertyUnit; persons: (Person & { role: string; receiveEmailNotifications: boolean; })[]; facilities: { parkingSpots: ParkingSpot[]; storageLockers: StorageLocker[]; bikeLockers: BikeLocker[]; }; violationCount: number; violations: { id: number; referenceNumber: string; violationType: string; status: string; createdAt: Date; }[]; } | undefined> {
    throw new Error("Method not implemented.");
  }

  async getPendingApprovalViolations(userId: string): Promise<(Violation & { unit: PropertyUnit })[]> {
    const result = await db
      .select({
        violation: violations,
        unit: propertyUnits,
      })
      .from(violations)
      .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
      .where(and(
        eq(violations.status, 'pending_approval'),
        eq(violations.reportedById, userId)
      ))
      .orderBy(desc(violations.createdAt));

    return result.map(r => ({
      ...r.violation,
      unit: r.unit,
    }));
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

  async createViolationAccessLink(_data: {
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

  async addEmailVerificationCode(params: { personId: number, violationId: number, codeHash: string, expiresAt: Date }): Promise<void> {
    await db.insert(emailVerificationCodes).values(params);
  }

  async getEmailVerificationCode(personId: number, violationId: number, codeHash: string): Promise<any> {
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
  
  async markEmailVerificationCodeUsed(id: number): Promise<void> {
    await db.update(emailVerificationCodes).set({ usedAt: new Date(), codeHash: '' }).where(eq(emailVerificationCodes.id, id));
  }

  async getMonthlyFines(filters?: { from?: Date, to?: Date, categoryId?: number }): Promise<{ month: string, totalFines: number }[]>;

  async getMonthlyFines(_filters?: { from?: Date, to?: Date, categoryId?: number }): Promise<{ month: string, totalFines: number }[]> {
    throw new Error("Method not implemented.");
  }

  async updateUnitWithPersonsAndFacilities(
    _unitId: number,
    _unitData: Partial<InsertPropertyUnit>,
    _personsData: Array<{ id?: number; fullName: string; email: string; phone?: string; role: 'owner' | 'tenant'; receiveEmailNotifications: boolean }>,
    _facilitiesData: { parkingSpots?: string[]; storageLockers?: string[]; bikeLockers?: string[] }
  ): Promise<{ unit: PropertyUnit; persons: Person[]; roles: UnitPersonRole[]; facilities: any }> {
    throw new Error("Method not implemented.");
  }

  async createPublicUserSession(_data: {
    personId: number;
    unitId: number;
    email: string;
    role: string;
    expiresInHours?: number;
  }): Promise<any> {
    throw new Error("Method not implemented.");
  }

  async getPublicUserSession(_sessionId: string): Promise<any> {
    throw new Error("Method not implemented.");
  }

  async getViolationsForUnit(_unitId: number, _includeStatuses?: string[]): Promise<any[]> {
    throw new Error("Method not implemented.");
  }

  async expirePublicUserSession(_sessionId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

export const storage = new DatabaseStorage();