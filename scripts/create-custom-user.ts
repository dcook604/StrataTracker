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

async function createCustomUser() {
  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, "dcook@spectrum4.ca")
    });

    if (existingUser) {
      console.log("User already exists");
      process.exit(0);
    }

    // Create user
    const hashedPassword = await hashPassword("admin123!");
    
    await db.insert(users).values({
      email: "dcook@spectrum4.ca",
      username: "dcook@spectrum4.ca",
      password: hashedPassword,
      fullName: "D Cook",
      isAdmin: true,
      isUser: true,
      forcePasswordChange: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("User created successfully");
  } catch (error) {
    console.error("Error creating user:", error);
  } finally {
    process.exit(0);
  }
}

createCustomUser(); 