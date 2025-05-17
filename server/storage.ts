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
import connectPg from "connect-pg-simple";

const scryptAsync = promisify(scrypt);

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  getAllViolations(): Promise<Violation[]>;
  getViolationsByStatus(status: ViolationStatus): Promise<Violation[]>;
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
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: db.driver.client,
      createTableIfMissing: true,
    });
  }

  // Password management
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await this.hashPassword(insertUser.password);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
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

  async getViolationWithUnit(id: number): Promise<(Violation & { unit: PropertyUnit }) | undefined> {
    const result = await db
      .select({
        violation: violations,
        unit: propertyUnits
      })
      .from(violations)
      .innerJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
      .where(eq(violations.id, id));

    if (result.length === 0) return undefined;

    return {
      ...result[0].violation,
      unit: result[0].unit
    };
  }

  async getAllViolations(): Promise<Violation[]> {
    return db.select().from(violations).orderBy(desc(violations.createdAt));
  }

  async getViolationsByStatus(status: ViolationStatus): Promise<Violation[]> {
    return db.select().from(violations)
      .where(eq(violations.status, status))
      .orderBy(desc(violations.createdAt));
  }

  async getViolationsByUnit(unitId: number): Promise<Violation[]> {
    return db.select().from(violations)
      .where(eq(violations.unitId, unitId))
      .orderBy(desc(violations.createdAt));
  }

  async getViolationsByReporter(userId: number): Promise<Violation[]> {
    return db.select().from(violations)
      .where(eq(violations.reportedById, userId))
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
    const [newViolation] = await db.insert(violations).values(violation).returning();
    return newViolation;
  }

  async updateViolation(id: number, violation: Partial<InsertViolation>): Promise<Violation | undefined> {
    const [updatedViolation] = await db
      .update(violations)
      .set({ ...violation, updatedAt: new Date() })
      .where(eq(violations.id, id))
      .returning();
    return updatedViolation;
  }

  async updateViolationStatus(id: number, status: ViolationStatus): Promise<Violation | undefined> {
    return this.updateViolation(id, { status });
  }

  async setViolationFine(id: number, amount: number): Promise<Violation | undefined> {
    return this.updateViolation(id, { fineAmount: amount });
  }

  // Violation history operations
  async getViolationHistory(violationId: number): Promise<ViolationHistory[]> {
    return db.select()
      .from(violationHistories)
      .where(eq(violationHistories.violationId, violationId))
      .orderBy(violationHistories.createdAt);
  }

  async addViolationHistory(history: InsertViolationHistory): Promise<ViolationHistory> {
    const [newHistory] = await db.insert(violationHistories).values(history).returning();
    return newHistory;
  }

  // Reporting operations
  async getRepeatViolations(minCount: number): Promise<{ unitId: number, unitNumber: string, count: number, lastViolationDate: Date }[]> {
    const result = await db.query.violations.findMany({
      columns: {
        unitId: true,
      },
      with: {
        unit: {
          columns: {
            unitNumber: true
          }
        }
      }
    });

    // Process results to count violations per unit
    const countMap = new Map<number, { unitNumber: string, count: number, dates: Date[] }>();
    
    result.forEach(v => {
      const currentUnitData = countMap.get(v.unitId) || { unitNumber: v.unit.unitNumber, count: 0, dates: [] };
      currentUnitData.count += 1;
      if (v.violationDate) {
        currentUnitData.dates.push(new Date(v.violationDate));
      }
      countMap.set(v.unitId, currentUnitData);
    });
    
    // Filter and format
    const repeatViolations = Array.from(countMap.entries())
      .filter(([_, data]) => data.count >= minCount)
      .map(([unitId, data]) => ({
        unitId,
        unitNumber: data.unitNumber,
        count: data.count,
        lastViolationDate: data.dates.sort((a, b) => b.getTime() - a.getTime())[0] // most recent date
      }))
      .sort((a, b) => b.count - a.count);
    
    return repeatViolations;
  }

  async getViolationStats(): Promise<{ 
    totalViolations: number,
    newViolations: number,
    pendingViolations: number,
    approvedViolations: number,
    disputedViolations: number,
    rejectedViolations: number
  }> {
    const totalViolations = await db.select({ count: sql<number>`count(*)` }).from(violations);
    const newViolations = await db.select({ count: sql<number>`count(*)` }).from(violations).where(eq(violations.status, "new"));
    const pendingViolations = await db.select({ count: sql<number>`count(*)` }).from(violations).where(eq(violations.status, "pending_approval"));
    const approvedViolations = await db.select({ count: sql<number>`count(*)` }).from(violations).where(eq(violations.status, "approved"));
    const disputedViolations = await db.select({ count: sql<number>`count(*)` }).from(violations).where(eq(violations.status, "disputed"));
    const rejectedViolations = await db.select({ count: sql<number>`count(*)` }).from(violations).where(eq(violations.status, "rejected"));
    
    return {
      totalViolations: totalViolations[0].count,
      newViolations: newViolations[0].count,
      pendingViolations: pendingViolations[0].count,
      approvedViolations: approvedViolations[0].count,
      disputedViolations: disputedViolations[0].count,
      rejectedViolations: rejectedViolations[0].count
    };
  }

  async getViolationsByMonth(year: number): Promise<{ month: number, count: number }[]> {
    // Calculate date range for the year
    const startDate = new Date(year, 0, 1); // January 1st of the year
    const endDate = new Date(year + 1, 0, 1); // January 1st of next year
    
    const violationsInYear = await db.select({
      month: sql<number>`EXTRACT(MONTH FROM ${violations.createdAt})::integer`,
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
}

export const storage = new DatabaseStorage();
