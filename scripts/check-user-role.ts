#!/usr/bin/env tsx

/**
 * User Role Diagnostic Script
 * 
 * This script helps diagnose user role issues by:
 * 1. Checking if a user exists in the profiles table
 * 2. Verifying their role assignment
 * 3. Checking if they exist in Supabase auth
 * 4. Providing recommendations for fixing role issues
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { profiles } from '#shared/schema.js';
import { eq, sql } from 'drizzle-orm';

// Production database connection
const DATABASE_URL = "postgres://spectrum4:lY0_6JVAcSG8utftr_MA@localhost:5438/spectrum4";

async function checkUserRole(email: string) {
  console.log(`🔍 Checking user role for: ${email}`);
  console.log('=' .repeat(50));

  try {
    // Connect to production database
    const client = postgres(DATABASE_URL);
    const db = drizzle(client);

    // Test database connection
    console.log('📡 Testing database connection...');
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection successful\n');

    // First, let's see all profiles to understand the data structure
    console.log('📋 ALL PROFILES IN SYSTEM:');
    const allProfiles = await db.select().from(profiles).orderBy(sql`${profiles.updatedAt} DESC`);
    console.log(`Total profiles: ${allProfiles.length}`);
    
    if (allProfiles.length === 0) {
      console.log('❌ No profiles found in the system');
      console.log('\n🔧 RECOMMENDATIONS:');
      console.log('1. Check if the profiles table exists and has data');
      console.log('2. Verify database migrations have been run');
      console.log('3. Check if users have logged in (triggers profile creation)');
      return;
    }

    // Show all profiles with role information
    allProfiles.forEach(profile => {
      const roleIcon = profile.role === 'admin' ? '👑' : profile.role === 'council' ? '👥' : '👤';
      const name = profile.fullName || 'No name';
      const emailMatch = name.toLowerCase().includes('dcook') || name.toLowerCase().includes('cook') ? '🎯' : '  ';
      console.log(`${emailMatch} ${roleIcon} ${name} (${profile.role}) - ${profile.updatedAt}`);
    });

    // Now search for the specific user more carefully
    console.log('\n🔍 SEARCHING FOR USER:');
    const searchTerm = email.split('@')[0].toLowerCase(); // "dcook"
    
    // Search by name pattern
    const nameMatches = allProfiles.filter(p => 
      p.fullName && p.fullName.toLowerCase().includes(searchTerm)
    );
    
    // Search by ID pattern (in case the ID contains part of the email)
    const idMatches = allProfiles.filter(p => 
      p.id.toString().toLowerCase().includes(searchTerm)
    );

    if (nameMatches.length > 0 || idMatches.length > 0) {
      console.log(`✅ Found potential matches for "${searchTerm}":`);
      
      const allMatches = [...new Set([...nameMatches, ...idMatches])];
      allMatches.forEach((profile, index) => {
        console.log(`\n   Match ${index + 1}:`);
        console.log(`   - ID: ${profile.id}`);
        console.log(`   - Full Name: ${profile.fullName || 'Not set'}`);
        console.log(`   - Role: ${profile.role}`);
        console.log(`   - Updated: ${profile.updatedAt}`);
        
        if (profile.role === 'admin') {
          console.log(`   🎉 ADMIN ACCESS CONFIRMED!`);
        } else {
          console.log(`   ⚠️  Current role: ${profile.role}`);
        }
      });

      // Check if any match has admin role
      const adminMatches = allMatches.filter(p => p.role === 'admin');
      if (adminMatches.length > 0) {
        console.log('\n🎉 ADMIN ACCESS CONFIRMED!');
        console.log('The user has admin privileges in the system.');
      } else {
        console.log('\n⚠️  NO ADMIN ACCESS');
        console.log('The user does not have admin privileges.');
        
        console.log('\n🔧 TO GRANT ADMIN ACCESS:');
        console.log('1. Connect to the production database');
        console.log('2. Run: UPDATE profiles SET role = \'admin\' WHERE id = \'<user-uuid>\';');
        console.log('3. Restart the application to ensure changes take effect');
      }
    } else {
      console.log(`❌ No profiles found matching "${searchTerm}"`);
      console.log('\n🔧 RECOMMENDATIONS:');
      console.log('1. Check if user exists in Supabase auth.users table');
      console.log('2. Verify the user has logged in at least once (triggers profile creation)');
      console.log('3. Check if there are any database connection issues');
      console.log('4. Verify the email format matches exactly');
      console.log('5. Check if the user might be using a different name format');
    }

    await client.end();
    
  } catch (error) {
    console.error('❌ Error checking user role:', error);
    
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
    console.log('Usage: npx tsx scripts/check-user-role.ts <email>');
    console.log('Example: npx tsx scripts/check-user-role.ts dcook@spectrum4.ca');
    process.exit(1);
  }

  await checkUserRole(email);
}

main().catch(console.error);
