#!/usr/bin/env npx tsx

import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from "drizzle-orm/node-postgres";
import { 
  propertyUnits, 
  persons, 
  unitPersonRoles,
  parkingSpots,
  storageLockers,
  bikeLockers
} from "../shared/schema";
import { eq } from "drizzle-orm";
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables if .env exists
if (fs.existsSync('.env')) {
  dotenv.config();
}

// Database connection
const connectionString = process.env.DATABASE_URL || "postgres://spectrum4:spectrum4password@localhost:5432/spectrum4";
const pool = new Pool({ 
  connectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});
const db = drizzle(pool);

// Sample data arrays for realistic generation
const firstNames = [
  "John", "Jane", "Michael", "Sarah", "David", "Emily", "Robert", "Lisa", "James", "Mary",
  "William", "Patricia", "Richard", "Jennifer", "Charles", "Linda", "Christopher", "Elizabeth",
  "Daniel", "Barbara", "Matthew", "Susan", "Anthony", "Jessica", "Mark", "Karen", "Donald",
  "Nancy", "Steven", "Betty", "Andrew", "Helen", "Joshua", "Sandra", "Kenneth", "Donna",
  "Paul", "Carol", "Kevin", "Ruth", "Brian", "Sharon", "George", "Michelle", "Edward",
  "Laura", "Ronald", "Sarah", "Timothy", "Kimberly", "Jason", "Deborah", "Jeffrey", "Dorothy"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez",
  "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor",
  "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez",
  "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright",
  "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker",
  "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts", "Chen", "Wang", "Li"
];

const streets = [
  "Main St", "Oak Ave", "Maple Dr", "Pine St", "Cedar Ave", "Elm St", "Park Ave", "First St",
  "Second St", "Third St", "Fourth St", "Fifth St", "Sixth St", "Seventh St", "Eighth St",
  "Washington St", "Lincoln Ave", "Jefferson Dr", "Madison St", "Monroe Ave", "Adams St",
  "Jackson Ave", "Van Buren Dr", "Harrison St", "Tyler Ave", "Polk St", "Taylor Dr",
  "Fillmore Ave", "Pierce St", "Buchanan Ave", "Johnson Dr", "Grant St", "Hayes Ave"
];

const cities = [
  "Vancouver", "Burnaby", "Richmond", "Surrey", "Coquitlam", "North Vancouver", "West Vancouver",
  "New Westminster", "Port Coquitlam", "Langley", "Delta", "White Rock", "Maple Ridge",
  "Port Moody", "Pitt Meadows", "Anmore", "Belcarra", "Bowen Island", "Lions Bay"
];

const postalCodes = [
  "V5K", "V5L", "V5M", "V5N", "V5P", "V5R", "V5S", "V5T", "V5V", "V5W", "V5X", "V5Y", "V5Z",
  "V6A", "V6B", "V6C", "V6E", "V6G", "V6H", "V6J", "V6K", "V6L", "V6M", "V6N", "V6P", "V6R",
  "V6S", "V6T", "V6V", "V6W", "V6X", "V6Y", "V6Z", "V7A", "V7B", "V7C", "V7E", "V7G", "V7H"
];

// Utility functions
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmail(firstName: string, lastName: string): string {
  const providers = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "shaw.ca", "telus.net"];
  const provider = getRandomElement(providers);
  const randomNum = getRandomNumber(1, 999);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@${provider}`;
}

function generatePhone(): string {
  const area = getRandomNumber(200, 999);
  const exchange = getRandomNumber(200, 999);
  const number = getRandomNumber(1000, 9999);
  return `${area}-${exchange}-${number}`;
}

function generatePostalCode(): string {
  const base = getRandomElement(postalCodes);
  const num1 = getRandomNumber(0, 9);
  const letter = String.fromCharCode(65 + getRandomNumber(0, 25));
  const num2 = getRandomNumber(0, 9);
  return `${base} ${num1}${letter}${num2}`;
}

async function generateTestData() {
  console.log("🚀 Starting test data generation...");
  
  try {
    // Skip cleanup to avoid foreign key constraint issues
    console.log("ℹ️  Adding new test data (preserving existing data)...");
    
    // Get existing unit numbers to avoid duplicates
    console.log("🔍 Checking existing unit numbers...");
    const existingUnits = await db.select({ unitNumber: propertyUnits.unitNumber }).from(propertyUnits);
    const existingUnitNumbers = new Set(existingUnits.map(u => u.unitNumber));
    console.log(`📋 Found ${existingUnitNumbers.size} existing units`);
    
    console.log("📦 Generating 200 units with owners and tenants...");
    
    let unitsCreated = 0;
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loop
    
    while (unitsCreated < 200 && attempts < maxAttempts) {
      attempts++;
      
      // Generate unique unit number
      let unitNumber: string;
      let maxRetries = 50;
      do {
        unitNumber = `${getRandomNumber(1, 30)}${String(getRandomNumber(1, 999)).padStart(2, '0')}`;
        maxRetries--;
      } while (existingUnitNumbers.has(unitNumber) && maxRetries > 0);
      
      if (existingUnitNumbers.has(unitNumber)) {
        console.log(`⚠️  Could not generate unique unit number after retries, skipping...`);
        continue;
      }
      
      existingUnitNumbers.add(unitNumber); // Add to set to avoid duplicates in this batch
      
      const floor = getRandomNumber(1, 30);
      
      // Generate unit data
      const unitData = {
        unitNumber,
        strataLot: `SL${getRandomNumber(1, 500)}`,
        floor: floor.toString(),
        mailingStreet1: `${getRandomNumber(100, 9999)} ${getRandomElement(streets)}`,
        mailingStreet2: Math.random() > 0.8 ? `Unit ${getRandomNumber(1, 50)}` : null,
        mailingCity: getRandomElement(cities),
        mailingStateProvince: "BC",
        mailingPostalCode: generatePostalCode(),
        mailingCountry: "Canada",
        phone: Math.random() > 0.3 ? generatePhone() : null,
        notes: Math.random() > 0.7 ? `Unit ${unitNumber} - ${getRandomElement(["Corner unit", "Garden view", "Mountain view", "City view", "Renovated", "Original condition"])}` : null,
      };
      
      // Create unit
      const [unit] = await db.insert(propertyUnits).values(unitData).returning();
      console.log(`📍 Created Unit ${unitNumber} (ID: ${unit.id})`);
      
      // Generate owner
      const ownerFirstName = getRandomElement(firstNames);
      const ownerLastName = getRandomElement(lastNames);
      const ownerData = {
        fullName: `${ownerFirstName} ${ownerLastName}`,
        email: generateEmail(ownerFirstName, ownerLastName),
        phone: Math.random() > 0.2 ? generatePhone() : null,
        hasCat: Math.random() > 0.8,
        hasDog: Math.random() > 0.7,
      };
      
      const [owner] = await db.insert(persons).values(ownerData).returning();
      
      // Create owner role
      await db.insert(unitPersonRoles).values({
        unitId: unit.id,
        personId: owner.id,
        role: "owner",
        receiveEmailNotifications: Math.random() > 0.1, // 90% receive notifications
      });
      
      console.log(`👤 Created Owner: ${owner.fullName}`);
      
      // Generate tenant (70% chance)
      if (Math.random() > 0.3) {
        const tenantFirstName = getRandomElement(firstNames);
        const tenantLastName = getRandomElement(lastNames);
        const tenantData = {
          fullName: `${tenantFirstName} ${tenantLastName}`,
          email: generateEmail(tenantFirstName, tenantLastName),
          phone: Math.random() > 0.3 ? generatePhone() : null,
          hasCat: Math.random() > 0.8,
          hasDog: Math.random() > 0.7,
        };
        
        const [tenant] = await db.insert(persons).values(tenantData).returning();
        
        // Create tenant role
        await db.insert(unitPersonRoles).values({
          unitId: unit.id,
          personId: tenant.id,
          role: "tenant",
          receiveEmailNotifications: Math.random() > 0.2, // 80% receive notifications
        });
        
        console.log(`🏠 Created Tenant: ${tenant.fullName}`);
      }
      
      // Generate facilities (parking, storage, bike lockers)
      // Parking spots (60% chance)
      if (Math.random() > 0.4) {
        const parkingCount = getRandomNumber(1, 2);
        for (let p = 1; p <= parkingCount; p++) {
          await db.insert(parkingSpots).values({
            unitId: unit.id,
            identifier: `P${getRandomNumber(1, 500)}`,
          });
        }
        console.log(`🚗 Added ${parkingCount} parking spot(s)`);
      }
      
      // Storage lockers (40% chance)
      if (Math.random() > 0.6) {
        await db.insert(storageLockers).values({
          unitId: unit.id,
          identifier: `S${getRandomNumber(1, 200)}`,
        });
        console.log(`📦 Added storage locker`);
      }
      
      // Bike lockers (30% chance)
      if (Math.random() > 0.7) {
        await db.insert(bikeLockers).values({
          unitId: unit.id,
          identifier: `B${getRandomNumber(1, 100)}`,
        });
        console.log(`🚴 Added bike locker`);
      }
      
      // Progress indicator
      if (unitsCreated % 10 === 0) {
        console.log(`✅ Progress: ${unitsCreated}/200 units created`);
      }
      
      unitsCreated++;
    }
    
    // Generate summary statistics
    const unitCount = await db.select().from(propertyUnits);
    const personCount = await db.select().from(persons);
    const ownerCount = await db.select().from(unitPersonRoles).where(eq(unitPersonRoles.role, "owner"));
    const tenantCount = await db.select().from(unitPersonRoles).where(eq(unitPersonRoles.role, "tenant"));
    const parkingCount = await db.select().from(parkingSpots);
    const storageCount = await db.select().from(storageLockers);
    const bikeCount = await db.select().from(bikeLockers);
    
    console.log("\n🎉 Test data generation completed!");
    console.log("📊 Summary:");
    console.log(`   • Units: ${unitCount.length}`);
    console.log(`   • Persons: ${personCount.length}`);
    console.log(`   • Owners: ${ownerCount.length}`);
    console.log(`   • Tenants: ${tenantCount.length}`);
    console.log(`   • Parking Spots: ${parkingCount.length}`);
    console.log(`   • Storage Lockers: ${storageCount.length}`);
    console.log(`   • Bike Lockers: ${bikeCount.length}`);
    
  } catch (error) {
    console.error("❌ Error generating test data:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
generateTestData()
  .then(() => {
    console.log("✅ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }); 