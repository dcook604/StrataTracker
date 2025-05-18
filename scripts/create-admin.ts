import { db } from "../server/db";
import { users } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, "admin@spectrum4.com")
    });

    if (existingAdmin) {
      console.log("Admin user already exists");
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await hashPassword("Admin123!");
    
    await db.insert(users).values({
      email: "admin@spectrum4.com",
      password: hashedPassword,
      fullName: "Administrator",
      isAdmin: true,
      isCouncilMember: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Admin user created successfully");
    console.log("Email: admin@spectrum4.com");
    console.log("Password: Admin123!");
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();