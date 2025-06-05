import { 
  users, 
  customers,
  propertyUnits,
  violationCategories,
  systemSettings,
  violations,
  violationHistories,
  persons,
  type User, 
  type InsertUser,
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
  type BikeLocker
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, like, or, not, gte, lte, asc, SQL, Name, inArray } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import memorystore from "memorystore";
import { relations, sql as drizzleSql, InferModel, count as drizzleCount } from 'drizzle-orm';
import { pgTable, serial, text, varchar, timestamp, integer, boolean, jsonb, pgEnum, PgTransaction } from 'drizzle-orm/pg-core';
import { drizzle, NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import connectPgSimple from 'connect-pg-simple';
import logger from './utils/logger';
import { Buffer } from 'buffer';
import { randomUUID } from "crypto";

const scryptAsync = promisify(scrypt);

const MemoryStore = memorystore(session) as any;

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  updateUserPassword(id: number, password: string): Promise<boolean>;
  updateUserPasswordResetToken(id: number, token: string | null, expires: Date | null): Promise<boolean>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  incrementFailedLoginAttempts(id: number): Promise<void>;
  resetFailedLoginAttempts(id: number): Promise<void>;
  updateLastLogin(id: number): Promise<void>;
  
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
  
  // System settings operations
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
  updateSystemSetting(key: string, value: string, userId: number): Promise<SystemSetting>;
  
  // Violation operations
  getViolation(id: number): Promise<Violation | undefined>;
  getViolationByReference(referenceNumber: string): Promise<Violation | undefined>;
  getViolationWithUnit(id: number): Promise<(Violation & { unit: PropertyUnit & { ownerName?: string | null, ownerEmail?: string | null, tenantName?: string | null, tenantEmail?: string | null } }) | undefined>;
  getViolationWithUnitByUuid(uuid: string): Promise<(Violation & { unit: PropertyUnit & { ownerName?: string | null, ownerEmail?: string | null, tenantName?: string | null, tenantEmail?: string | null } }) | undefined>;
  getAllViolations(): Promise<(Violation & { unit: PropertyUnit })[]>;
  getViolationsByStatus(status: ViolationStatus): Promise<(Violation & { unit: PropertyUnit })[]>;
  getViolationsByUnit(unitId: number): Promise<Violation[]>;
  getViolationsByReporter(userId: number): Promise<Violation[]>;
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
  
  // Password management
  hashPassword(password: string): Promise<string>;
  comparePasswords(supplied: string, stored: string): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;

  getViolationsPaginated(page: number, limit: number, status?: string, unitId?: number, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{ violations: (Violation & { unit: PropertyUnit })[], total: number }>;
  getAllUnitsPaginated(page: number, limit: number, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<{ units: PropertyUnit[], total: number }>;

  setUserLock(id: number, locked: boolean, reason?: string): Promise<void>;

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
  getPendingApprovalViolations(userId: number): Promise<(Violation & { unit: PropertyUnit })[]>;

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
    id: number;
    email: string;
    fullName: string;
  }>>;
}

export interface ViolationHistoryWithUser extends ViolationHistory {
  userFullName?: string | null;
  violationUuid: string | null;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Create a proper MemoryStore instance with session cleanup
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
  }

  // Password management
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const startTime = Date.now();
    logger.debug(`[AUTH] Starting password comparison`);
    
    try {
      // Check if stored password has the correct format (hash.salt)
      if (!stored || !stored.includes(".")) {
        logger.error(`[AUTH] Invalid stored password format, should be 'hash.salt'`);
        return false;
      }
      
      const [hashed, salt] = stored.split(".");
      
      // Check if both hash and salt are present
      if (!hashed || !salt) {
        logger.error(`[AUTH] Missing hash or salt in stored password`);
        return false;
      }
      
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      const isMatch = timingSafeEqual(hashedBuf, suppliedBuf);
      
      logger.perf(`comparePasswords`, startTime, { 
        passwordMatch: isMatch,
        saltLength: salt.length,
        hashLength: hashed.length
      });
      
      logger.debug(`[AUTH] Password comparison result: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
      return isMatch;
    } catch (error) {
      logger.error(`[AUTH] Error comparing passwords`, { error });
      return false;
    }
  }
  
  // Customer management
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
    const [updatedCategory] = await db.update(violationCategories)
      .set({
        ...category, 
        updatedAt: new Date()
      })
      .where(eq(violationCategories.id, id))
      .returning();
      
    return updatedCategory;
  }
  
  // System settings operations
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, key));
    return setting;
  }
  
  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return db.select().from(systemSettings).orderBy(systemSettings.settingKey);
  }
  
  async updateSystemSetting(key: string, value: string, userId: number): Promise<SystemSetting> {
    // Check if setting exists
    const existing = await this.getSystemSetting(key);
    
    if (existing) {
      const [updated] = await db.update(systemSettings)
        .set({
          settingValue: value,
          updatedAt: new Date(),
          updatedById: userId
        })
        .where(eq(systemSettings.settingKey, key))
        .returning();
      
      return updated;
    } else {
      const [created] = await db.insert(systemSettings)
        .values({
          settingKey: key,
          settingValue: value,
          updatedById: userId
        })
        .returning();
      
      return created;
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const startTime = Date.now();
    logger.debug(`[DB] Getting user by email`, { email });
    
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      logger.perf(`getUserByEmail`, startTime, { 
        email, 
        found: !!user,
        userId: user?.id 
      });
      
      if (user) {
        logger.debug(`[DB] User found`, { 
          userId: user.id, 
          email: user.email, 
          isAdmin: user.isAdmin,
          accountLocked: user.accountLocked,
          failedLoginAttempts: user.failedLoginAttempts
        });
      } else {
        logger.debug(`[DB] User not found for email: ${email}`);
      }
      
      return user;
    } catch (error) {
      logger.error(`[DB] Error getting user by email`, { email, error });
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await this.hashPassword(insertUser.password);
    
    // For backward compatibility, set username to email if username is required by the database
    const userData = { 
      ...insertUser, 
      password: hashedPassword,
      username: insertUser.email // For backward compatibility with existing database schema
    };
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    // If password is being updated, hash it
    let dataToUpdate: any = { ...userData };
    if (userData.password) {
      dataToUpdate.password = await this.hashPassword(userData.password);
    }
    
    // For backward compatibility with existing schema
    if (userData.email) {
      dataToUpdate.username = userData.email;
    }
    
    const [updatedUser] = await db.update(users)
      .set({
        ...dataToUpdate,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
      
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      // Use a transaction to ensure all operations succeed or fail together
      return await db.transaction(async (tx) => {
        // 1. Update system settings to remove references to this user
        await tx.update(systemSettings)
          .set({ updatedById: null })
          .where(eq(systemSettings.updatedById, id));
        
        // 2. Update violation histories to use a system account
        await tx.update(violationHistories)
          .set({ userId: 1 }) // Use system account instead of null
          .where(eq(violationHistories.userId, id));
        
        // 3. Update violations to use a system account for reported_by
        await tx.update(violations)
          .set({ reportedById: 1 }) // Use system account
          .where(eq(violations.reportedById, id));
        
        // 4. Finally delete the user
        const result = await tx.delete(users)
          .where(eq(users.id, id));
        
        return result.rowCount ? result.rowCount > 0 : false;
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.fullName);
  }
  
  async incrementFailedLoginAttempts(id: number): Promise<void> {
    try {
      // Get current failed attempts
      const [user] = await db.select().from(users).where(eq(users.id, id));
      const failedAttempts = (user?.failedLoginAttempts || 0) + 1;
      const lock = failedAttempts >= 5;
      await db.update(users)
        .set({
          failedLoginAttempts: failedAttempts,
          accountLocked: lock,
          lockReason: lock ? 'Too many failed login attempts' : null
        })
        .where(eq(users.id, id));
    } catch (error) {
      console.error('Failed to increment login attempts:', error);
    }
  }
  
  async resetFailedLoginAttempts(id: number): Promise<void> {
    try {
      await db.update(users)
        .set({
          failedLoginAttempts: 0,
          accountLocked: false,
          lockReason: null
        })
        .where(eq(users.id, id));
    } catch (error) {
      console.error('Failed to reset login attempts:', error);
    }
  }
  
  async updateLastLogin(id: number): Promise<void> {
    try {
      await db.update(users)
        .set({
          lastLogin: new Date()
        })
        .where(eq(users.id, id));
    } catch (error) {
      console.error('Failed to update last login:', error);
    }
  }

  // Property units operations
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

  // Violation operations
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
  
  async getViolationsByReporter(userId: number): Promise<Violation[]> {
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
    const historyItems = await db
      .select({
        id: violationHistories.id,
        violationId: violationHistories.violationId,
        userId: violationHistories.userId,
        action: violationHistories.action,
        comment: violationHistories.comment,
        commenterName: violationHistories.commenterName,
        createdAt: violationHistories.createdAt,
        userFullName: users.fullName,
        violationUuid: violations.uuid
      })
      .from(violationHistories)
      .leftJoin(users, eq(violationHistories.userId, users.id))
      .leftJoin(violations, eq(violationHistories.violationId, violations.id))
      .where(eq(violationHistories.violationId, violationId))
      .orderBy(desc(violationHistories.createdAt));

    return historyItems.map((item: { id: number; violationId: number; userId: number | null; action: string; comment: string | null; commenterName: string | null; createdAt: Date; userFullName: string | null; violationUuid: string | null; }) => ({
      id: item.id,
      violationId: item.violationId,
      userId: item.userId ?? 1, // Default to system user ID 1 if null
      action: item.action,
      comment: item.comment,
      commenterName: item.commenterName,
      createdAt: item.createdAt,
      userFullName: item.userFullName,
      violationUuid: item.violationUuid
    }));
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
  
  // Implement password management methods
  async updateUserPassword(id: number, password: string): Promise<boolean> {
    try {
      const hashedPassword = await this.hashPassword(password);
      
      const result = await db.update(users)
        .set({
          password: hashedPassword,
          forcePasswordChange: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error updating user password:', error);
      return false;
    }
  }
  
  async updateUserPasswordResetToken(id: number, token: string | null, expires: Date | null): Promise<boolean> {
    try {
      const result = await db.update(users)
        .set({
          passwordResetToken: token,
          passwordResetExpires: expires,
          updatedAt: new Date()
        })
        .where(eq(users.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error updating password reset token:', error);
      return false;
    }
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

  async getAllUnitsPaginated(page: number = 1, limit: number = 20, sortBy?: string, sortOrder?: 'asc' | 'desc') {
    const offset = (page - 1) * limit;
    
    // Determine sort order
    let orderByClause;
    if (sortBy === 'floor') {
      orderByClause = sortOrder === 'asc' ? asc(propertyUnits.floor) : desc(propertyUnits.floor);
    } else if (sortBy === 'createdAt') {
      orderByClause = sortOrder === 'asc' ? asc(propertyUnits.createdAt) : desc(propertyUnits.createdAt);
    } else if (sortBy === 'updatedAt') {
      orderByClause = sortOrder === 'asc' ? asc(propertyUnits.updatedAt) : desc(propertyUnits.updatedAt);
    } else if (sortBy === 'id') {
      orderByClause = sortOrder === 'asc' ? asc(propertyUnits.id) : desc(propertyUnits.id);
    } else {
      // Default to unitNumber
      orderByClause = sortOrder === 'asc' ? asc(propertyUnits.unitNumber) : desc(propertyUnits.unitNumber);
    }

    // Get units with persons
    const paginatedUnits = await db
      .select({
        unit: propertyUnits,
        roles: unitPersonRoles,
        person: persons
      })
      .from(propertyUnits)
      .leftJoin(unitPersonRoles, eq(propertyUnits.id, unitPersonRoles.unitId))
      .leftJoin(persons, eq(unitPersonRoles.personId, persons.id))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Get all unit IDs from the paginated results
    const unitIdsMap: { [key: number]: boolean } = {};
    paginatedUnits.forEach(row => {
      unitIdsMap[row.unit.id] = true;
    });
    const unitIds = Object.keys(unitIdsMap).map(Number);

    // Fetch facilities for all units
    const parkingSpotsData = unitIds.length > 0 ? await db
      .select()
      .from(parkingSpots)
      .where(sql`${parkingSpots.unitId} IN (${sql.join(unitIds, sql`, `)})`) : [];

    const storageLockersData = unitIds.length > 0 ? await db
      .select()
      .from(storageLockers)
      .where(sql`${storageLockers.unitId} IN (${sql.join(unitIds, sql`, `)})`) : [];

    const bikeLockersData = unitIds.length > 0 ? await db
      .select()
      .from(bikeLockers)
      .where(sql`${bikeLockers.unitId} IN (${sql.join(unitIds, sql`, `)})`) : [];

    // Group the results by unit
    const unitsMap = new Map<number, any>();
    
    paginatedUnits.forEach((row: any) => {
      const unitId = row.unit.id;
      
      if (!unitsMap.has(unitId)) {
        unitsMap.set(unitId, {
          ...row.unit,
          owners: [],
          tenants: [],
          facilities: {
            parkingSpots: parkingSpotsData.filter((p: ParkingSpot) => p.unitId === unitId),
            storageLockers: storageLockersData.filter((s: StorageLocker) => s.unitId === unitId),
            bikeLockers: bikeLockersData.filter((b: BikeLocker) => b.unitId === unitId)
          }
        });
      }
      
      const unit = unitsMap.get(unitId);
      
      // Add person to appropriate role array if they exist
      if (row.person && row.roles) {
        const personWithNotificationPref = {
          ...row.person,
          receiveEmailNotifications: row.roles.receiveEmailNotifications
        };
        
        if (row.roles.role === 'owner') {
          // Check if person is already added to avoid duplicates
          if (!unit.owners.find((p: any) => p.id === row.person!.id)) {
            unit.owners.push(personWithNotificationPref);
          }
        } else if (row.roles.role === 'tenant') {
          // Check if person is already added to avoid duplicates
          if (!unit.tenants.find((p: any) => p.id === row.person!.id)) {
            unit.tenants.push(personWithNotificationPref);
          }
        }
      }
    });

    // Convert map to array
    const unitsWithPeopleAndFacilities = Array.from(unitsMap.values());

    // Count query
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(propertyUnits);

    return {
      units: unitsWithPeopleAndFacilities as (PropertyUnit & { owners: Person[], tenants: Person[], facilities: { parkingSpots: ParkingSpot[], storageLockers: StorageLocker[], bikeLockers: BikeLocker[] } })[],
      total: Number(count)
    };
  }

  async setUserLock(id: number, locked: boolean, reason?: string): Promise<void> {
    try {
      await db.update(users)
        .set({
          accountLocked: locked,
          lockReason: locked ? (reason || 'Locked by administrator') : null
        })
        .where(eq(users.id, id));
    } catch (error) {
      console.error('Failed to set user lock:', error);
    }
  }

  /**
   * Create a unit with multiple persons/roles (owners/tenants) and facilities in a single transaction.
   * @param unitData - { unit: InsertPropertyUnit, facilities: { parkingSpots?: string[], storageLockers?: string[], bikeLockers?: string[] }, persons: Array<{ fullName, email, phone, role: 'owner' | 'tenant', receiveEmailNotifications: boolean, hasCat?: boolean, hasDog?: boolean }> }
   * @returns The created unit, facilities, and associated persons/roles.
   */
  async createUnitWithPersons(unitData: {
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
  }): Promise<{ unit: PropertyUnit; facilities: { parkingSpots: ParkingSpot[], storageLockers: StorageLocker[], bikeLockers: BikeLocker[] }; persons: Person[]; roles: UnitPersonRole[] }> {
    return await db.transaction(async (trx) => {
      // 1. Create or find the unit
      let [unit] = await trx.select().from(propertyUnits).where(eq(propertyUnits.unitNumber, unitData.unit.unitNumber));
      if (!unit) {
        [unit] = await trx.insert(propertyUnits).values(unitData.unit).returning();
      } else {
        // If unit exists, update it (optional, depending on desired behavior)
        // For now, we assume if unit exists by number, we don't update its core details,
        // but we will update/create persons, roles, and facilities.
      }

      // 2. Create facilities in the new tables
      // Delete existing facilities for this unit first
      await trx.delete(parkingSpots).where(eq(parkingSpots.unitId, unit.id));
      await trx.delete(storageLockers).where(eq(storageLockers.unitId, unit.id));
      await trx.delete(bikeLockers).where(eq(bikeLockers.unitId, unit.id));

      // Insert new facilities
      const createdParkingSpots: ParkingSpot[] = [];
      if (unitData.facilities.parkingSpots && unitData.facilities.parkingSpots.length > 0) {
        const parkingData = unitData.facilities.parkingSpots.map(identifier => ({
          unitId: unit.id,
          identifier
        }));
        const inserted = await trx.insert(parkingSpots).values(parkingData).returning();
        createdParkingSpots.push(...inserted);
      }

      const createdStorageLockers: StorageLocker[] = [];
      if (unitData.facilities.storageLockers && unitData.facilities.storageLockers.length > 0) {
        const storageData = unitData.facilities.storageLockers.map(identifier => ({
          unitId: unit.id,
          identifier
        }));
        const inserted = await trx.insert(storageLockers).values(storageData).returning();
        createdStorageLockers.push(...inserted);
      }

      const createdBikeLockers: BikeLocker[] = [];
      if (unitData.facilities.bikeLockers && unitData.facilities.bikeLockers.length > 0) {
        const bikeData = unitData.facilities.bikeLockers.map(identifier => ({
          unitId: unit.id,
          identifier
        }));
        const inserted = await trx.insert(bikeLockers).values(bikeData).returning();
        createdBikeLockers.push(...inserted);
      }

      // 3. For each person, create or find by email, and update pet info
      const personIds: { [email: string]: number } = {};
      for (const p of unitData.persons) {
        let [person] = await trx.select().from(persons).where(eq(persons.email, p.email));
        if (!person) {
          [person] = await trx.insert(persons).values({
            fullName: p.fullName,
            email: p.email,
            phone: p.phone,
            hasCat: p.hasCat,
            hasDog: p.hasDog
          }).returning();
        } else {
          [person] = await trx.update(persons).set({
            fullName: p.fullName,
            phone: p.phone,
            hasCat: p.hasCat,
            hasDog: p.hasDog,
            updatedAt: new Date()
          }).where(eq(persons.id, person.id)).returning();
        }
        personIds[p.email] = person.id;
      }

      // 4. Create unit_person_roles for each person/role (dedupe by unitId+personId+role)
      for (const p of unitData.persons) {
        const existingRole = await trx.select().from(unitPersonRoles)
          .where(and(eq(unitPersonRoles.unitId, unit.id), eq(unitPersonRoles.personId, personIds[p.email]), eq(unitPersonRoles.role, p.role)));
        if (!existingRole.length) {
          await trx.insert(unitPersonRoles).values({
            unitId: unit.id,
            personId: personIds[p.email],
            role: p.role,
            receiveEmailNotifications: p.receiveEmailNotifications
          }).returning();
        } else {
          await trx.update(unitPersonRoles)
            .set({ receiveEmailNotifications: p.receiveEmailNotifications })
            .where(and(
              eq(unitPersonRoles.unitId, unit.id),
              eq(unitPersonRoles.personId, personIds[p.email]),
              eq(unitPersonRoles.role, p.role)
            ));
        }
      }
      // 5. Return the unit, facilities, and all associated persons/roles
      const roles = await trx.select().from(unitPersonRoles).where(eq(unitPersonRoles.unitId, unit.id));
      const personList: Person[] = roles.length > 0 ? await trx.select().from(persons).where(or(...roles.map((r: UnitPersonRole) => eq(persons.id, r.personId)))) : [];
      
      return {
        unit,
        facilities: {
          parkingSpots: createdParkingSpots,
          storageLockers: createdStorageLockers,
          bikeLockers: createdBikeLockers
        },
        persons: personList,
        roles
      };
    });
  }

  async getViolationAccessLinkByToken(token: string): Promise<ViolationAccessLink | undefined> {
    const [link] = await db.select().from(violationAccessLinks).where(eq(violationAccessLinks.token, token));
    return link;
  }

  async markViolationAccessLinkUsed(id: number): Promise<void> {
    await db.update(violationAccessLinks).set({ usedAt: new Date() }).where(eq(violationAccessLinks.id, id));
  }

  async deleteViolation(id: number): Promise<boolean> {
    try {
      return await db.transaction(async (tx) => {
        // First, delete related records in dependent tables
        await tx.delete(violationHistories).where(eq(violationHistories.violationId, id));
        await tx.delete(violationAccessLinks).where(eq(violationAccessLinks.violationId, id));
        
        // Then delete the violation itself
        const result = await tx.delete(violations).where(eq(violations.id, id)).returning({ id: violations.id });
        
        return result.length > 0;
      });
    } catch (error) {
      console.error("Error deleting violation:", error);
      throw new Error("Failed to delete violation");
    }
  }

  async deleteViolationByUuid(uuid: string): Promise<boolean> {
    try {
      // First get the violation by UUID to get the integer ID
      const violation = await this.getViolationWithUnitByUuid(uuid);
      if (!violation) {
        return false;
      }
      
      return await this.deleteViolation(violation.id);
    } catch (error) {
      console.error("Error deleting violation by UUID:", error);
      throw new Error("Failed to delete violation");
    }
  }

  async deleteAllViolationsData(): Promise<{ deletedViolationsCount: number, deletedHistoriesCount: number, deletedAccessLinksCount: number }> {
    try {
      return await db.transaction(async (tx) => {
        const deletedHistoriesResult = await tx.delete(violationHistories).returning({ id: violationHistories.id });
        const deletedHistoriesCount = deletedHistoriesResult.length;
        console.log(`Deleted ${deletedHistoriesCount} violation histories.`);

        const deletedAccessLinksResult = await tx.delete(violationAccessLinks).returning({ id: violationAccessLinks.id });
        const deletedAccessLinksCount = deletedAccessLinksResult.length;
        console.log(`Deleted ${deletedAccessLinksCount} violation access links.`);

        const deletedViolationsResult = await tx.delete(violations).returning({ id: violations.id });
        const deletedViolationsCount = deletedViolationsResult.length;
        console.log(`Deleted ${deletedViolationsCount} violations.`);

        return {
          deletedViolationsCount,
          deletedHistoriesCount,
          deletedAccessLinksCount
        };
      });
    } catch (error) {
      console.error("Error during deleteAllViolationsData transaction:", error);
      throw new Error("Failed to delete all violations data. Check server logs for details.");
    }
  }

  async deleteUnit(id: number): Promise<boolean> {
    try {
      return await db.transaction(async (tx) => {
        // First, delete all violations associated with this unit
        const violationsToDelete = await tx.select().from(violations).where(eq(violations.unitId, id));
        
        for (const violation of violationsToDelete) {
          // Delete violation histories and access links for each violation
          await tx.delete(violationHistories).where(eq(violationHistories.violationId, violation.id));
          await tx.delete(violationAccessLinks).where(eq(violationAccessLinks.violationId, violation.id));
        }
        
        // Delete the violations themselves
        await tx.delete(violations).where(eq(violations.unitId, id));
        
        // Delete unit_person_roles associated with this unit
        await tx.delete(unitPersonRoles).where(eq(unitPersonRoles.unitId, id));
        
        // Delete facilities associated with this unit
        await tx.delete(parkingSpots).where(eq(parkingSpots.unitId, id));
        await tx.delete(storageLockers).where(eq(storageLockers.unitId, id));
        await tx.delete(bikeLockers).where(eq(bikeLockers.unitId, id));
        
        // Finally, delete the unit itself
        const result = await tx.delete(propertyUnits).where(eq(propertyUnits.id, id)).returning({ id: propertyUnits.id });
        
        return result.length > 0;
      });
    } catch (error) {
      console.error("Error deleting unit:", error);
      throw new Error("Failed to delete unit");
    }
  }

  async getUnitWithPersonsAndFacilities(id: number): Promise<{ unit: PropertyUnit; persons: (Person & { role: string; receiveEmailNotifications: boolean })[]; facilities: { parkingSpots: ParkingSpot[], storageLockers: StorageLocker[], bikeLockers: BikeLocker[] }; violationCount: number; violations: { id: number; referenceNumber: string; violationType: string; status: string; createdAt: Date }[] } | undefined> {
    const unit = await this.getPropertyUnit(id);
    if (!unit) {
      return undefined;
    }

    const personsWithRoles = await db
      .select({
        person: persons,
        role: unitPersonRoles.role,
        receiveEmailNotifications: unitPersonRoles.receiveEmailNotifications
      })
      .from(unitPersonRoles)
      .innerJoin(persons, eq(unitPersonRoles.personId, persons.id))
      .where(eq(unitPersonRoles.unitId, id));

    const facilities = {
      parkingSpots: await db.select().from(parkingSpots).where(eq(parkingSpots.unitId, id)),
      storageLockers: await db.select().from(storageLockers).where(eq(storageLockers.unitId, id)),
      bikeLockers: await db.select().from(bikeLockers).where(eq(bikeLockers.unitId, id))
    };

    const unitViolations: Violation[] = await db
      .select()
      .from(violations)
      .where(eq(violations.unitId, id));

    return {
      unit,
      persons: personsWithRoles.map((p) => ({
        ...p.person,
        role: p.role,
        receiveEmailNotifications: p.receiveEmailNotifications
      })),
      facilities,
      violationCount: unitViolations.length,
      violations: unitViolations.map((v) => ({
        id: v.id,
        referenceNumber: v.referenceNumber,
        violationType: v.violationType,
        status: v.status,
        createdAt: v.createdAt
      }))
    };
  }

  async getPendingApprovalViolations(userId: number): Promise<(Violation & { unit: PropertyUnit })[]> {
    try {
      const result = await db
        .select({
          violation: violations,
          unit: propertyUnits
        })
        .from(violations)
        .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
        .where(eq(violations.status, 'pending_approval'))
        .orderBy(desc(violations.createdAt));
    
      return result.map((r: { violation: Violation; unit: PropertyUnit }) => ({
        ...r.violation,
        unit: r.unit
      }));
    } catch (error) {
      console.error(`[ERROR_DB] Failed to getPendingApprovalViolations:`, error);
      throw error;
    }
  }

  async getPersonsWithRolesForUnit(unitId: number): Promise<Array<{
    personId: number;
    fullName: string;
    email: string;
    role: string;
    receiveEmailNotifications: boolean;
  }>> {
    try {
      const result = await db
        .select({
          personId: persons.id,
          fullName: persons.fullName,
          email: persons.email,
          role: unitPersonRoles.role,
          receiveEmailNotifications: unitPersonRoles.receiveEmailNotifications,
        })
        .from(unitPersonRoles)
        .innerJoin(persons, eq(unitPersonRoles.personId, persons.id))
        .where(eq(unitPersonRoles.unitId, unitId))
        .execute();
      
      // Ensure role is one of the expected values, though DB constraint might exist
      return result.map(r => ({
        ...r,
        role: r.role || 'unknown', // Default or throw error if role is critical and nullable
        receiveEmailNotifications: r.receiveEmailNotifications ?? true // Default if nullable, though schema says notNull().default(true)
      }));
    } catch (error) {
      console.error(`Error fetching persons for unit ${unitId}:`, error);
      throw error; // Or return empty array / handle as appropriate
    }
  }

  async createViolationAccessLink(data: {
    violationId: number;
    violationUuid: string;
    recipientEmail: string;
    expiresInDays?: number;
  }): Promise<string | null> {
    try {
      const token = randomUUID();
      const expiresInDays = data.expiresInDays || 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const newLinkData: InsertViolationAccessLink = {
        violationId: data.violationId,
        violationUuid: data.violationUuid,
        recipientEmail: data.recipientEmail,
        token: token,
        expiresAt: expiresAt,
      };
      
      await db.insert(violationAccessLinks).values(newLinkData);
      return token;
    } catch (error) {
      console.error('Error creating violation access link:', error);
      return null;
    }
  }

  async getAdminAndCouncilUsers(): Promise<Array<{
    id: number;
    email: string;
    fullName: string;
  }>> {
    try {
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
        })
        .from(users)
        .where(or(eq(users.isAdmin, true), eq(users.isCouncilMember, true)))
        .execute();
      return result;
    } catch (error) {
      console.error("Error fetching admin and council users:", error);
      throw error; 
    }
  }
}

export const storage = new DatabaseStorage();