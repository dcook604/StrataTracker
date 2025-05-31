// Test script for email deduplication system
// Run with: node test-email-deduplication.js

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function testEmailDeduplication() {
  console.log('🧪 Testing Email Deduplication System...\n');

  try {
    // Test 1: Check if email stats endpoint is working
    console.log('1. Testing email stats endpoint...');
    const statsResponse = await fetch(`${BASE_URL}/api/communications/email-stats?hours=24`, {
      credentials: 'include'
    });
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('✅ Email stats endpoint working');
      console.log(`   - Total sent: ${stats.stats.totalSent}`);
      console.log(`   - Duplicates prevented: ${stats.stats.duplicatesPrevented}`);
      console.log(`   - Unique recipients: ${stats.stats.uniqueRecipients}\n`);
    } else {
      console.log('❌ Email stats endpoint not accessible (might need authentication)\n');
    }

    // Test 2: Check deduplication logs endpoint
    console.log('2. Testing deduplication logs endpoint...');
    const logsResponse = await fetch(`${BASE_URL}/api/communications/email-deduplication-logs?hours=24&limit=10`, {
      credentials: 'include'
    });
    
    if (logsResponse.ok) {
      const logs = await logsResponse.json();
      console.log('✅ Deduplication logs endpoint working');
      console.log(`   - Recent log entries: ${logs.count}`);
      if (logs.logs.length > 0) {
        console.log(`   - Latest entry: ${logs.logs[0].emailType} to ${logs.logs[0].recipientEmail}`);
      }
      console.log('');
    } else {
      console.log('❌ Deduplication logs endpoint not accessible (might need authentication)\n');
    }

    // Test 3: Check database tables exist
    console.log('3. Testing database table existence...');
    const healthResponse = await fetch(`${BASE_URL}/api/health/db`, {
      credentials: 'include'
    });
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Database health check passed');
      
      const emailTables = health.tables.filter(table => 
        table.includes('email_idempotency') || 
        table.includes('email_send_attempts') || 
        table.includes('email_deduplication_log')
      );
      
      console.log(`   - Email deduplication tables found: ${emailTables.length}`);
      emailTables.forEach(table => console.log(`     - ${table}`));
      
      if (emailTables.length >= 3) {
        console.log('✅ All required email deduplication tables present');
      } else {
        console.log('⚠️  Some email deduplication tables might be missing');
      }
      console.log('');
    } else {
      console.log('❌ Database health check failed (might need authentication)\n');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }

  console.log('🎯 Email Deduplication System Test Complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Log in to the admin panel');
  console.log('2. Navigate to Communications → Email Monitoring');
  console.log('3. Send a test email campaign');
  console.log('4. Try sending the same campaign again to see deduplication in action');
  console.log('5. Monitor the statistics and logs in the dashboard');
}

testEmailDeduplication(); 