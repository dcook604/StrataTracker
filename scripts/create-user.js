const { db } = require('../server/db');
const { storage } = require('../server/storage');

async function createUser() {
  try {
    const user = await storage.createUser({
      email: 'dcook@spectrum4.ca',
      username: 'dcook@spectrum4.ca',
      password: 'admin123!',
      fullName: 'D Cook',
      isAdmin: true,
      isUser: true,
      forcePasswordChange: false
    });
    
    console.log('User created successfully:', user);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    process.exit();
  }
}

createUser(); 