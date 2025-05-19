import { db } from "../server/db";
import { storage } from "../server/storage";
import { insertUserSchema } from "../shared/schema";

async function createUser() {
  try {
    const userData = {
      email: "dcook@spectrum4.ca",
      username: "dcook@spectrum4.ca",
      password: "admin123!",
      fullName: "D Cook",
      isAdmin: true,
      isUser: true,
      forcePasswordChange: false
    };

    const user = await storage.createUser(userData);
    console.log("User created successfully:", user);
  } catch (error) {
    console.error("Error creating user:", error);
  } finally {
    process.exit(0);
  }
}

createUser(); 