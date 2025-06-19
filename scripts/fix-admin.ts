import { db } from "../server/db";
import { users } from "../shared/schema";
import { scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = "testsalt123456789";
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createSimpleAdmin() {
  try {
    // Create a new admin user with a predictable hash
    const hashedPassword = await hashPassword("password123");
    
    // Create a new admin user with fixed username
    await db.insert(users).values({
      email: "simple@admin.com",
      username: "simpleadmin",
      password: hashedPassword,
      fullName: "Simple Admin",
      isAdmin: true,
      isCouncilMember: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Simple admin user created successfully");
    console.log("Email: simple@admin.com");
    console.log("Password: password123");
    console.log("Hashed password:", hashedPassword);
  } catch (error) {
    console.error("Error creating simple admin user:", error);
  } finally {
    process.exit(0);
  }
}

createSimpleAdmin();