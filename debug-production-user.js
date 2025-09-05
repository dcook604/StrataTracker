import { Client } from 'pg';

async function checkProductionUser() {
  const client = new Client({
    connectionString: 'postgres://spectrum4:lY0_6JVAcSG8utftr_MA@postgres:5432/spectrum4'
  });

  try {
    console.log('Connecting to production database...');
    await client.connect();
    console.log('✅ Connected to production database');

    // Check if user exists in profiles table
    console.log('\n--- Checking user profile ---');
    const profileResult = await client.query(
      'SELECT id, full_name, role, updated_at FROM profiles WHERE id IN (SELECT id FROM profiles WHERE full_name ILIKE $1 OR $2 = ANY(string_to_array(full_name, \' \')))',
      ['%dcook%', 'dcook']
    );
    
    console.log('Profile search results:', profileResult.rows);

    // Check for any profile with dcook in email if we have email field
    console.log('\n--- Checking for dcook email patterns ---');
    const emailSearchResult = await client.query(
      `SELECT id, full_name, role, updated_at FROM profiles WHERE id IN 
       (SELECT id FROM profiles WHERE full_name ILIKE '%dcook%')`
    );
    
    console.log('Email pattern search results:', emailSearchResult.rows);

    // Get all admin users for reference
    console.log('\n--- All admin users ---');
    const adminResult = await client.query(
      "SELECT id, full_name, role, updated_at FROM profiles WHERE role = 'admin' ORDER BY updated_at DESC"
    );
    
    console.log('Admin users:', adminResult.rows);

    // Get total user count
    console.log('\n--- Database statistics ---');
    const statsResult = await client.query(
      "SELECT role, COUNT(*) as count FROM profiles GROUP BY role ORDER BY role"
    );
    
    console.log('User role distribution:', statsResult.rows);

    // Check if we have any violations to see if data exists
    console.log('\n--- Sample data check ---');
    const violationCount = await client.query('SELECT COUNT(*) as count FROM violations');
    const unitCount = await client.query('SELECT COUNT(*) as count FROM property_units');
    
    console.log('Total violations:', violationCount.rows[0]?.count || 0);
    console.log('Total units:', unitCount.rows[0]?.count || 0);

  } catch (error) {
    console.error('❌ Database error:', error.message);
    
    // Try alternative hostname
    if (error.message.includes('could not translate host name')) {
      console.log('\n--- Trying alternative connection methods ---');
      
      // Try with localhost
      const localClient = new Client({
        connectionString: 'postgres://spectrum4:lY0_6JVAcSG8utftr_MA@localhost:5432/spectrum4'
      });
      
      try {
        await localClient.connect();
        console.log('✅ Connected via localhost');
        
        const result = await localClient.query(
          "SELECT id, full_name, role FROM profiles WHERE role = 'admin' LIMIT 5"
        );
        console.log('Sample admin users via localhost:', result.rows);
        
        await localClient.end();
      } catch (localError) {
        console.error('❌ Localhost connection also failed:', localError.message);
      }
    }
  } finally {
    try {
      await client.end();
    } catch (e) {
      // Ignore connection end errors
    }
  }
}

checkProductionUser().catch(console.error);
