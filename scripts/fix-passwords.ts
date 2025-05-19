import { db } from "../server/db";
import { users } from "../shared/schema";
import { storage } from "../server/storage";
import { eq } from "drizzle-orm";

async function fixPasswords() {
  try {
    console.log("Starting password fix script...");
    
    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users to process`);
    
    // Temporary password that users will need to change
    const tempPassword = "ChangeMe123!";
    const hashedTemp = await storage.hashPassword(tempPassword);
    
    // Update each user
    for (const user of allUsers) {
      try {
        await db.update(users)
          .set({
            password: hashedTemp,
            forcePasswordChange: true,
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id));
        
        console.log(`Updated user ${user.email}`);
      } catch (err) {
        console.error(`Failed to update user ${user.email}:`, err);
      }
    }
    
    console.log("\nPassword fix complete!");
    console.log("All users must now use the temporary password 'ChangeMe123!' and will be required to change it on next login.");
    
  } catch (err) {
    console.error("Script failed:", err);
  } finally {
    process.exit();
  }
}

fixPasswords(); 