#!/usr/bin/env tsx

/**
 * Grant Admin Access Script
 * 
 * This script safely grants admin access to a user by:
 * 1. Verifying the user exists
 * 2. Updating their role to 'admin'
 * 3. Confirming the change
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { profiles } from '#shared/schema.js';
import { eq, sql } from 'drizzle-orm';

// Production database connection
const DATABASE_URL = "postgres://spectrum4:lY0_6JVAcSG8utftr_MA@localhost:5438/spectrum4";

async function grantAdminAccess(email: string) {
  console.log(`🔐 Granting admin access to: ${email}`);
  console.log('=' .repeat(50));

  try {
    // Connect to production database
    const client = postgres(DATABASE_URL);
    const db = drizzle(client);

    // Test database connection
    console.log('📡 Testing database connection...');
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection successful\n');

    // Find the user by email pattern
    const searchTerm = email.split('@')[0].toLowerCase(); // "dcook"
    
    console.log(`🔍 Searching for user "${searchTerm}"...`);
    
    // Get all profiles to find the user
    const allProfiles = await db.select().from(profiles);
    const userProfile = allProfiles.find(p => 
      p.fullName && p.fullName.toLowerCase().includes(searchTerm)
    );

    if (!userProfile) {
      console.log(`❌ User "${searchTerm}" not found in profiles table`);
      console.log('\nAvailable profiles:');
      allProfiles.forEach(profile => {
        const roleIcon = profile.role === 'admin' ? '👑' : profile.role === 'council' ? '👥' : '👤';
        console.log(`${roleIcon} ${profile.fullName || 'No name'} (${profile.role})`);
      });
      await client.end();
      return;
    }

    console.log(`✅ Found user: ${userProfile.fullName} (ID: ${userProfile.id})`);
    console.log(`Current role: ${userProfile.role}`);

    if (userProfile.role === 'admin') {
      console.log('🎉 User already has admin access!');
      await client.end();
      return;
    }

    // Confirm the action
    console.log('\n⚠️  WARNING: This will grant ADMIN privileges to the user.');
    console.log('This means they will have access to:');
    console.log('- User management');
    console.log('- System settings');
    console.log('- All violation data');
    console.log('- Email configuration');
    console.log('- Database operations');
    
    // In a real script, you might want to add a confirmation prompt
    // For now, we'll proceed with the update
    
    console.log('\n🔄 Updating user role to admin...');
    
    // Update the user's role to admin
    const updatedProfile = await db
      .update(profiles)
      .set({ 
        role: 'admin',
        updatedAt: new Date()
      })
      .where(eq(profiles.id, userProfile.id))
      .returning();

    if (updatedProfile.length > 0) {
      const updated = updatedProfile[0];
      console.log('✅ SUCCESS! User role updated to admin');
      console.log(`\nUpdated Profile:`);
      console.log(`- ID: ${updated.id}`);
      console.log(`- Full Name: ${updated.fullName}`);
      console.log(`- Role: ${updated.role}`);
      console.log(`- Updated: ${updated.updatedAt}`);
      
      console.log('\n🎉 ADMIN ACCESS GRANTED!');
      console.log('\n🔧 NEXT STEPS:');
      console.log('1. The user should now have admin access');
      console.log('2. They may need to log out and log back in');
      console.log('3. If issues persist, restart the application');
      console.log('4. Verify admin access by checking the admin panel');
      
    } else {
      console.log('❌ Failed to update user role');
    }

    await client.end();
    
  } catch (error) {
    console.error('❌ Error granting admin access:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n🔧 CONNECTION ISSUE:');
        console.log('1. Verify PostgreSQL container is running: docker ps | grep postgres');
        console.log('2. Check if port 5438 is accessible: netstat -tlnp | grep 5438');
        console.log('3. Verify database credentials in DATABASE_URL');
      } else if (error.message.includes('authentication failed')) {
        console.log('\n🔧 AUTHENTICATION ISSUE:');
        console.log('1. Verify database password is correct');
        console.log('2. Check if user "spectrum4" exists in PostgreSQL');
        console.log('3. Verify database "spectrum4" exists');
      }
    }
  }
}

// Main execution
async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: npx tsx scripts/grant-admin-access.ts <email>');
    console.log('Example: npx tsx scripts/grant-admin-access.ts dcook@spectrum4.ca');
    process.exit(1);
  }

  await grantAdminAccess(email);
}

main().catch(console.error);

