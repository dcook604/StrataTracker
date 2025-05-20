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
    // Support custom user via env or args
    const email = process.env.USER_EMAIL || process.argv[2] || "admin@spectrum4.com";
    const password = process.env.USER_PASSWORD || process.argv[3] || "Admin123!";
    const fullName = process.env.USER_FULLNAME || process.argv[4] || "Administrator";

    // Check if admin already exists
    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email)
    });

    if (existingAdmin) {
      console.log(`User with email ${email} already exists`);
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await hashPassword(password);
    
    await db.insert(users).values({
      email,
      password: hashedPassword,
      fullName,
      isAdmin: true,
      isCouncilMember: true,
      isUser: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Admin user created successfully`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();