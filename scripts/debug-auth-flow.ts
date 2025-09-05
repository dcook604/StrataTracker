#!/usr/bin/env tsx

/**
 * Authentication Flow Debug Script
 * 
 * This script helps debug authentication issues by:
 * 1. Checking the user's profile in the database
 * 2. Verifying Supabase authentication
 * 3. Testing the authentication middleware
 * 4. Identifying where the access denial occurs
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { profiles } from '#shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

// Production database connection
const DATABASE_URL = "postgres://spectrum4:lY0_6JVAcSG8utftr_MA@localhost:5438/spectrum4";

// Supabase configuration (from your .env)
const SUPABASE_URL = "https://bmtydjmymvvsqudonfiz.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtdHlkam15bXZ2c3F1ZG9uZml6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTM4Nzk5MSwiZXhwIjoyMDY0OTYzOTkxfQ.WagAVdRjL59U5t52ZBO5EHoiSP8g_QNdjaw_aXHdAhM";

async function debugAuthFlow(email: string) {
  console.log(`🔍 Debugging authentication flow for: ${email}`);
  console.log('=' .repeat(60));

  try {
    // 1. Check PostgreSQL database
    console.log('📊 STEP 1: Checking PostgreSQL Database');
    console.log('-'.repeat(40));
    
    const client = postgres(DATABASE_URL);
    const db = drizzle(client);

    // Test database connection
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection successful');

    // Find user profile
    const searchTerm = email.split('@')[0].toLowerCase();
    const allProfiles = await db.select().from(profiles);
    const userProfile = allProfiles.find(p => 
      p.fullName && p.fullName.toLowerCase().includes(searchTerm)
    );

    if (!userProfile) {
      console.log('❌ User profile not found in PostgreSQL');
      await client.end();
      return;
    }

    console.log(`✅ User profile found:`);
    console.log(`   - ID: ${userProfile.id}`);
    console.log(`   - Full Name: ${userProfile.fullName}`);
    console.log(`   - Role: ${userProfile.role}`);
    console.log(`   - Updated: ${userProfile.updatedAt}`);

    if (userProfile.role !== 'admin') {
      console.log('❌ User does NOT have admin role in database');
      console.log('🔧 Fix: Update role to admin in database');
      await client.end();
      return;
    }

    console.log('✅ User has admin role in database');
    await client.end();

    // 2. Check Supabase authentication
    console.log('\n📡 STEP 2: Checking Supabase Authentication');
    console.log('-'.repeat(40));
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // List all users to find dcook
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log('❌ Error listing Supabase users:', listError.message);
      return;
    }

    const supabaseUser = users.users.find(u => 
      u.email?.toLowerCase().includes(searchTerm) || 
      u.user_metadata?.full_name?.toLowerCase().includes(searchTerm)
    );

    if (!supabaseUser) {
      console.log('❌ User not found in Supabase auth.users');
      console.log('🔧 This could be the issue - user needs to exist in Supabase');
      return;
    }

    console.log(`✅ User found in Supabase:`);
    console.log(`   - ID: ${supabaseUser.id}`);
    console.log(`   - Email: ${supabaseUser.email}`);
    console.log(`   - Email Confirmed: ${supabaseUser.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   - Last Sign In: ${supabaseUser.last_sign_in_at || 'Never'}`);
    console.log(`   - Created: ${supabaseUser.created_at}`);

    // 3. Check if there's a UUID mismatch
    console.log('\n🔗 STEP 3: Checking UUID Consistency');
    console.log('-'.repeat(40));
    
    if (supabaseUser.id !== userProfile.id) {
      console.log('❌ CRITICAL ISSUE: UUID mismatch detected!');
      console.log(`   - Supabase ID: ${supabaseUser.id}`);
      console.log(`   - PostgreSQL ID: ${userProfile.id}`);
      console.log('🔧 This will cause authentication failures');
      console.log('🔧 The user needs to log in again to sync the UUIDs');
      return;
    }

    console.log('✅ UUIDs match between Supabase and PostgreSQL');

    // 4. Check authentication middleware logic
    console.log('\n🔐 STEP 4: Analyzing Authentication Middleware');
    console.log('-'.repeat(40));
    
    console.log('📋 Authentication Flow Analysis:');
    console.log('1. User logs in → Supabase validates credentials');
    console.log('2. Supabase returns JWT with user ID');
    console.log('3. Backend receives JWT in Authorization header');
    console.log('4. Backend verifies JWT with Supabase');
    console.log('5. Backend looks up profile in PostgreSQL using user ID');
    console.log('6. Backend checks profile.role for authorization');
    
    console.log('\n🔍 Potential Issues:');
    console.log('- JWT token might be expired or invalid');
    console.log('- User needs to log out and log back in');
    console.log('- Browser cache might have old authentication state');
    console.log('- Frontend React state might not be updated');
    console.log('- Session storage might have old user data');

    // 5. Recommendations
    console.log('\n🔧 STEP 5: Troubleshooting Steps');
    console.log('-'.repeat(40));
    
    console.log('1. **Immediate Actions:**');
    console.log('   - User should log out completely');
    console.log('   - Clear browser cache and cookies');
    console.log('   - Log back in with fresh credentials');
    
    console.log('\n2. **If Issue Persists:**');
    console.log('   - Check browser console for errors');
    console.log('   - Check network tab for failed API calls');
    console.log('   - Verify JWT token in browser storage');
    
    console.log('\n3. **Backend Verification:**');
    console.log('   - Check application logs for auth errors');
    console.log('   - Verify JWT verification is working');
    console.log('   - Test authentication middleware manually');
    
    console.log('\n4. **Database Verification:**');
    console.log('   - Confirm profile.role = "admin"');
    console.log('   - Check for any database constraints');
    console.log('   - Verify database connection in production');

    console.log('\n🎯 **Most Likely Cause:**');
    console.log('The user has an old JWT token or cached authentication state');
    console.log('that doesn\'t reflect their new admin role. A fresh login should fix this.');

  } catch (error) {
    console.error('❌ Error during authentication debug:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n🔧 CONNECTION ISSUE:');
        console.log('1. Verify PostgreSQL container is running');
        console.log('2. Check if port 5438 is accessible');
        console.log('3. Verify database credentials');
      } else if (error.message.includes('authentication failed')) {
        console.log('\n🔧 AUTHENTICATION ISSUE:');
        console.log('1. Verify database password is correct');
        console.log('2. Check if user "spectrum4" exists in PostgreSQL');
      }
    }
  }
}

// Main execution
async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: npx tsx scripts/debug-auth-flow.ts <email>');
    console.log('Example: npx tsx scripts/debug-auth-flow.ts dcook@spectrum4.ca');
    process.exit(1);
  }

  await debugAuthFlow(email);
}

main().catch(console.error);

