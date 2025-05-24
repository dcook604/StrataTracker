import { 
  users, 
  customers,
  propertyUnits,
  violationCategories,
  systemSettings,
  violations,
  violationHistories,
  persons as personsTable,
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
  type UnitFacility
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, like, or, not, gte, lte, asc, SQL, Name, inArray } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import memorystore from "memorystore";
import { relations, sql as drizzleSql, InferModel, count as drizzleCount } from 'drizzle-orm';
import { pgTable, serial, text, varchar, timestamp, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { drizzle, NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import connectPgSimple from 'connect-pg-simple';

const scryptAsync = promisify(scrypt);

const MemoryStore = memorystore(session);

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
  getViolationWithUnit(id: number): Promise<(Violation & { unit: PropertyUnit }) | undefined>;
  getAllViolations(): Promise<(Violation & { unit: PropertyUnit })[]>;
  getViolationsByStatus(status: ViolationStatus): Promise<(Violation & { unit: PropertyUnit })[]>;
  getViolationsByUnit(unitId: number): Promise<Violation[]>;
  getViolationsByReporter(userId: number): Promise<Violation[]>;
  getViolationsByCategory(categoryId: number): Promise<Violation[]>;
  getRecentViolations(limit: number): Promise<(Violation & { unit: PropertyUnit })[]>;
  createViolation(violation: InsertViolation): Promise<Violation>;
  updateViolation(id: number, violation: Partial<InsertViolation>): Promise<Violation | undefined>;
  updateViolationStatus(id: number, status: ViolationStatus): Promise<Violation | undefined>;
  setViolationFine(id: number, amount: number): Promise<Violation | undefined>;
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
   * @param unitData - { unit: InsertPropertyUnit, facilities: InsertUnitFacility, persons: Array<{ fullName, email, phone, role: 'owner' | 'tenant', receiveEmailNotifications: boolean, hasCat?: boolean, hasDog?: boolean }> }
   * @returns The created unit, facilities, and associated persons/roles.
   */
  createUnitWithPersons(unitData: {
    unit: InsertPropertyUnit,
    facilities: Omit<InsertUnitFacility, 'unitId' | 'id' | 'createdAt' | 'updatedAt'>,
    persons: Array<{
      fullName: string;
      email: string;
      phone?: string;
      role: 'owner' | 'tenant';
      receiveEmailNotifications: boolean;
      hasCat?: boolean;
      hasDog?: boolean;
    }>
  }): Promise<{ unit: PropertyUnit; facilities: UnitFacility; persons: Person[]; roles: UnitPersonRole[] }>;

  // Violation access link operations
  createViolationAccessLink(link: InsertViolationAccessLink): Promise<ViolationAccessLink>;
  getViolationAccessLinkByToken(token: string): Promise<ViolationAccessLink | undefined>;
  markViolationAccessLinkUsed(id: number): Promise<void>;
}

export interface ViolationHistoryWithUser extends ViolationHistory {
  userFullName?: string | null;
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
    try {
      // Check if stored password has the correct format (hash.salt)
      if (!stored || !stored.includes(".")) {
        console.error("Invalid stored password format, should be 'hash.salt'");
        return false;
      }
      
      const [hashed, salt] = stored.split(".");
      
      // Check if both hash and salt are present
      if (!hashed || !salt) {
        console.error("Missing hash or salt in stored password");
        return false;
      }
      
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } catch (error) {
      console.error("Error comparing passwords:", error);
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
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
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

  async getViolationWithUnit(id: number): Promise<(Violation & { unit: PropertyUnit }) | undefined> {
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
    
    return {
      ...result[0].violation,
      unit: result[0].unit
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
    
    return result.map(r => ({
      ...r.violation,
      unit: r.unit
    }));
  }
  
  async getViolationsByStatus(status: ViolationStatus): Promise<(Violation & { unit: PropertyUnit })[]> {
    const result = await db
      .select({
        violation: violations,
        unit: propertyUnits
      })
      .from(violations)
      .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
      .where(eq(violations.status, status))
      .orderBy(desc(violations.createdAt));
    
    return result.map(r => ({
      ...r.violation,
      unit: r.unit
    }));
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
      
    return result.map(r => ({
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
      })
      .from(violationHistories)
      .leftJoin(users, eq(violationHistories.userId, users.id))
      .where(eq(violationHistories.violationId, violationId))
      .orderBy(desc(violationHistories.createdAt));

    return historyItems.map(item => ({
      id: item.id,
      violationId: item.violationId,
      userId: item.userId,
      action: item.action,
      comment: item.comment,
      commenterName: item.commenterName,
      createdAt: item.createdAt,
      userFullName: item.userFullName,
    }));
  }
  
  async addViolationHistory(history: InsertViolationHistory): Promise<ViolationHistory> {
    const [newHistory] = await db
      .insert(violationHistories)
      .values(history)
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
    const unitIds = result.map(r => r.unitId);
    
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
        or(...unitIds.map(id => eq(propertyUnits.id, id)))
      );
    
    // Create a map of unit IDs to unit numbers
    const unitMap = new Map();
    units.forEach(unit => {
      unitMap.set(unit.id, unit.unitNumber);
    });
    
    // Create the final result
    return result.map(r => ({
      unitId: r.unitId,
      unitNumber: unitMap.get(r.unitId) || 'Unknown',
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
      resolvedViolationsData.forEach(v => {
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

    return result.map(r => ({ 
      type: r.type ?? 'Unknown', // Use nullish coalescing for default type
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
    
    return result.map(r => ({
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
    
    const sortableColumns: Record<string, SQL<unknown> | undefined> = {
      unitNumber: propertyUnits.unitNumber,
      floor: propertyUnits.floor,
      // Add other sortable base fields of propertyUnits if needed
      createdAt: propertyUnits.createdAt,
      updatedAt: propertyUnits.updatedAt,
      id: propertyUnits.id
    };
    
    let orderByClause: SQL<unknown> | undefined = sortableColumns[sortBy || 'unitNumber'] || propertyUnits.unitNumber;
    if (orderByClause) {
      orderByClause = sortOrder === 'asc' ? asc(orderByClause) : desc(orderByClause);
    }

    const paginatedUnits = await db.query.propertyUnits.findMany({
      orderBy: orderByClause,
      limit: limit,
      offset: offset,
      with: {
        unitRoles: { // This must match the relation name in propertyUnitsRelations
          with: {
            person: true // This must match the relation name in unitPersonRolesRelations
          }
        },
        facilities: true // This must match the relation name in propertyUnitsRelations
      }
    });

    // Process units to structure owners and tenants
    const unitsWithPeopleAndFacilities = paginatedUnits.map(unit => {
      const owners: Person[] = [];
      const tenants: Person[] = [];
      if (unit.unitRoles) {
        unit.unitRoles.forEach(role => {
          if (role.person) { // Ensure person data is loaded
            const personWithNotificationPref = {
                ...role.person,
                receiveEmailNotifications: role.receiveEmailNotifications
            };
            if (role.role === 'owner') {
              owners.push(personWithNotificationPref as Person);
            } else if (role.role === 'tenant') {
              tenants.push(personWithNotificationPref as Person);
            }
          }
        });
      }
      // Remove unitRoles from the final unit object if it's not needed directly by frontend
      const { unitRoles, ...restOfUnit } = unit;
      return {
        ...restOfUnit,
        facilities: unit.facilities || undefined, // Ensure facilities is there or undefined
        owners,
        tenants,
      };
    });

    // Count query remains the same for now
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(propertyUnits);

    return {
      units: unitsWithPeopleAndFacilities as (PropertyUnit & { owners: Person[], tenants: Person[], facilities?: UnitFacility })[],
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
   * @param unitData - { unit: InsertPropertyUnit, facilities: InsertUnitFacility, persons: Array<{ fullName, email, phone, role: 'owner' | 'tenant', receiveEmailNotifications: boolean, hasCat?: boolean, hasDog?: boolean }> }
   * @returns The created unit, facilities, and associated persons/roles.
   */
  async createUnitWithPersons(unitData: {
    unit: InsertPropertyUnit,
    facilities: Omit<InsertUnitFacility, 'unitId' | 'id' | 'createdAt' | 'updatedAt'>,
    persons: Array<{
      fullName: string;
      email: string;
      phone?: string;
      role: 'owner' | 'tenant';
      receiveEmailNotifications: boolean;
      hasCat?: boolean;
      hasDog?: boolean;
    }>
  }): Promise<{ unit: PropertyUnit; facilities: UnitFacility; persons: Person[]; roles: UnitPersonRole[] }> {
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

      // 2. Create or update unit facilities
      let facilitiesRecord: UnitFacility | undefined;
      const existingFacilities = await trx.select().from(unitFacilities).where(eq(unitFacilities.unitId, unit.id)).limit(1);
      if (existingFacilities.length > 0) {
        [facilitiesRecord] = await trx.update(unitFacilities)
          .set({ ...unitData.facilities, updatedAt: new Date() })
          .where(eq(unitFacilities.unitId, unit.id))
          .returning();
      } else {
        [facilitiesRecord] = await trx.insert(unitFacilities)
          .values({ ...unitData.facilities, unitId: unit.id })
          .returning();
      }
      if (!facilitiesRecord) {
        throw new Error("Failed to create or update unit facilities.");
      }

      // 3. For each person, create or find by email, and update pet info
      const personIds: { [email: string]: number } = {};
      for (const p of unitData.persons) {
        let [person] = await trx.select().from(personsTable).where(eq(personsTable.email, p.email));
        if (!person) {
          [person] = await trx.insert(personsTable).values({
            fullName: p.fullName,
            email: p.email,
            phone: p.phone,
            hasCat: p.hasCat,
            hasDog: p.hasDog
          }).returning();
        } else {
          [person] = await trx.update(personsTable).set({
            fullName: p.fullName,
            phone: p.phone,
            hasCat: p.hasCat,
            hasDog: p.hasDog,
            updatedAt: new Date()
          }).where(eq(personsTable.id, person.id)).returning();
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
      const personList: Person[] = roles.length > 0 ? await trx.select().from(personsTable).where(or(...roles.map(r => eq(personsTable.id, r.personId)))) : [];
      
      return {
        unit,
        facilities: facilitiesRecord,
        persons: personList,
        roles
      };
    });
  }

  async createViolationAccessLink(link: InsertViolationAccessLink): Promise<ViolationAccessLink> {
    const [newLink] = await db.insert(violationAccessLinks).values(link).returning();
    return newLink;
  }

  async getViolationAccessLinkByToken(token: string): Promise<ViolationAccessLink | undefined> {
    const [link] = await db.select().from(violationAccessLinks).where(eq(violationAccessLinks.token, token));
    return link;
  }

  async markViolationAccessLinkUsed(id: number): Promise<void> {
    await db.update(violationAccessLinks).set({ usedAt: new Date() }).where(eq(violationAccessLinks.id, id));
  }
}

export const storage = new DatabaseStorage();