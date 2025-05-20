import { 
  users, 
  customers,
  propertyUnits,
  violationCategories,
  systemSettings,
  violations,
  violationHistories,
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
  type ViolationStatus
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, like, or, not, gte, lt } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import memorystore from "memorystore";

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
  getAllCustomers(page?: number, limit?: number): Promise<{ customers: Customer[], total: number }>;
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
  getViolationHistory(violationId: number): Promise<ViolationHistory[]>;
  addViolationHistory(history: InsertViolationHistory): Promise<ViolationHistory>;
  
  // Reporting operations
  getRepeatViolations(minCount: number): Promise<{ unitId: number, unitNumber: string, count: number, lastViolationDate: Date }[]>;
  getViolationStats(): Promise<{ 
    totalViolations: number,
    newViolations: number,
    pendingViolations: number,
    approvedViolations: number,
    disputedViolations: number,
    rejectedViolations: number
  }>;
  getViolationsByMonth(year: number): Promise<{ month: number, count: number }[]>;
  getViolationsByType(): Promise<{ type: string, count: number }[]>;
  
  // Password management
  hashPassword(password: string): Promise<string>;
  comparePasswords(supplied: string, stored: string): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;

  getViolationsPaginated(page: number = 1, limit: number = 20, status?: string, unitId?: number): Promise<{ violations: (Violation & { unit: PropertyUnit })[], total: number }>;
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
  
  async getAllCustomers(page: number = 1, limit: number = 10): Promise<{ customers: Customer[], total: number }> {
    const offset = (page - 1) * limit;
    const customersList = await db.select().from(customers)
      .limit(limit)
      .offset(offset)
      .orderBy(customers.unitNumber);
      
    const [countResult] = await db.select({
      count: sql`count(*)`
    }).from(customers);
    
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
    let query = db.select().from(violationCategories);
    
    if (activeOnly) {
      query = query.where(eq(violationCategories.active, true));
    }
    
    return query.orderBy(violationCategories.name);
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
      await db.update(users)
        .set({
          failedLoginAttempts: sql`COALESCE(${users.failedLoginAttempts}, 0) + 1`,
          accountLocked: sql`CASE WHEN COALESCE(${users.failedLoginAttempts}, 0) + 1 >= 5 THEN true ELSE ${users.accountLocked} END`
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
          accountLocked: false
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
    const [newViolation] = await db
      .insert(violations)
      .values({
        ...violation,
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
  async getViolationHistory(violationId: number): Promise<ViolationHistory[]> {
    return db
      .select()
      .from(violationHistories)
      .where(eq(violationHistories.violationId, violationId))
      .orderBy(desc(violationHistories.createdAt));
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
  
  async getViolationStats(): Promise<{ 
    totalViolations: number,
    newViolations: number,
    pendingViolations: number,
    approvedViolations: number,
    disputedViolations: number,
    rejectedViolations: number
  }> {
    const [counts] = await db
      .select({
        total: sql<number>`count(*)`,
        new: sql<number>`count(*) filter (where ${violations.status} = 'new')`,
        pending: sql<number>`count(*) filter (where ${violations.status} = 'pending_approval')`,
        approved: sql<number>`count(*) filter (where ${violations.status} = 'approved')`,
        disputed: sql<number>`count(*) filter (where ${violations.status} = 'disputed')`,
        rejected: sql<number>`count(*) filter (where ${violations.status} = 'rejected')`
      })
      .from(violations);
      
    return {
      totalViolations: Number(counts.total) || 0,
      newViolations: Number(counts.new) || 0,
      pendingViolations: Number(counts.pending) || 0,
      approvedViolations: Number(counts.approved) || 0,
      disputedViolations: Number(counts.disputed) || 0,
      rejectedViolations: Number(counts.rejected) || 0
    };
  }
  
  async getViolationsByMonth(year: number): Promise<{ month: number, count: number }[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);
    
    const violationsInYear = await db.select({
      month: sql<number>`EXTRACT(MONTH FROM ${violations.createdAt})`,
      count: sql<number>`count(*)`
    })
    .from(violations)
    .where(and(
      gte(violations.createdAt, startDate),
      lt(violations.createdAt, endDate)
    ))
    .groupBy(sql`EXTRACT(MONTH FROM ${violations.createdAt})`)
    .orderBy(sql`EXTRACT(MONTH FROM ${violations.createdAt})`);
    
    // Ensure all months are represented
    const result: { month: number, count: number }[] = [];
    for (let i = 1; i <= 12; i++) {
      const monthData = violationsInYear.find(v => v.month === i);
      result.push({ month: i, count: monthData ? monthData.count : 0 });
    }
    
    return result;
  }

  async getViolationsByType(): Promise<{ type: string, count: number }[]> {
    return db.select({
      type: violations.violationType,
      count: sql<number>`count(*)`
    })
    .from(violations)
    .groupBy(violations.violationType)
    .orderBy(desc(sql<number>`count(*)`));
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

  async getViolationsPaginated(page: number = 1, limit: number = 20, status?: string, unitId?: number): Promise<{ violations: (Violation & { unit: PropertyUnit })[], total: number }> {
    const offset = (page - 1) * limit;
    let query = db
      .select({ violation: violations, unit: propertyUnits })
      .from(violations)
      .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id));
    if (status) {
      query = query.where(eq(violations.status, status));
    }
    if (unitId) {
      query = query.where(eq(violations.unitId, unitId));
    }
    const result = await query
      .orderBy(desc(violations.createdAt))
      .limit(limit)
      .offset(offset);
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(violations)
      .where(
        and(
          status ? eq(violations.status, status) : sql`TRUE`,
          unitId ? eq(violations.unitId, unitId) : sql`TRUE`
        )
      );
    return {
      violations: result.map(r => ({ ...r.violation, unit: r.unit })),
      total: Number(count)
    };
  }
}

export const storage = new DatabaseStorage();