import { db } from "../server/db";
import { users } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function addCustomAdmin() {
  const email = "tester@test.com";
  const password = "Test123!"; // You can change this password if needed
  const fullName = "Tester Admin";

  console.log(`Attempting to create admin user: ${email}`);

  try {
    const existingUser = await db.query.users.findFirst({
      where: (usersTable, { eq }) => eq(usersTable.email, email),
    });

    if (existingUser) {
      console.log(`User ${email} already exists.`);
      // Update existing user to be admin if not already
      if (!existingUser.isAdmin) {
        await db.update(users)
          .set({ isAdmin: true, isCouncilMember: true, isUser: true, updatedAt: new Date() })
          .where(eq(users.email, email));
        console.log(`User ${email} updated to be an admin.`);
      } else {
        console.log(`User ${email} is already an admin.`);
      }
    } else {
      const hashedPassword = await hashPassword(password);

      await db.insert(users).values({
        email,
        username: email, // ensure username is set
        password: hashedPassword,
        fullName,
        isAdmin: true,
        isCouncilMember: true,
        isUser: true,
        forcePasswordChange: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("----------------------------------------");
      console.log("Admin User Created Successfully!");
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      console.log("----------------------------------------");
    }
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  } finally {
    // Ensure the process exits to avoid hanging
    setTimeout(() => process.exit(0), 1000);
  }
}

addCustomAdmin();