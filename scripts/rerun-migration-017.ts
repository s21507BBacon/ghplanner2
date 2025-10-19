import { Pool } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

// Load environment variables
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
}

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

async function rerunMigration() {
  const pool = new Pool({ connectionString });
  
  try {
    console.log('🔄 Re-running migration 017...\n');
    
    // Remove the migration record
    console.log('1. Removing migration record from schema_migrations...');
    await pool.query(`
      DELETE FROM schema_migrations 
      WHERE filename = '017_add_project_allocation_modes.sql'
    `);
    console.log('   ✓ Record removed\n');
    
    // Read and execute the migration
    console.log('2. Executing migration SQL...');
    const migrationPath = join(process.cwd(), 'database', 'migrations', '017_add_project_allocation_modes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    await pool.query(migrationSQL);
    console.log('   ✓ Migration SQL executed\n');
    
    // Record as executed
    console.log('3. Recording migration as executed...');
    await pool.query(
      'INSERT INTO schema_migrations (filename, executed_at) VALUES ($1, $2)',
      ['017_add_project_allocation_modes.sql', Date.now()]
    );
    console.log('   ✓ Migration recorded\n');
    
    // Verify the column exists
    console.log('4. Verifying allocation_mode column...');
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'enterprises' AND column_name = 'allocation_mode'
    `);
    
    if (result.rows.length > 0) {
      console.log('   ✅ SUCCESS! allocation_mode column exists in enterprises table\n');
    } else {
      console.log('   ❌ ERROR: Column still doesn\'t exist\n');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

rerunMigration();
