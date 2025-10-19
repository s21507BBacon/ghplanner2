import { Pool } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

// Load environment variables
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
}

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

async function checkSchema() {
  const pool = new Pool({ connectionString });
  
  try {
    // Check enterprises table columns
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'enterprises'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Enterprises table columns:');
    console.log('================================');
    result.rows.forEach((row: any) => {
      console.log(`  ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    const hasAllocationMode = result.rows.some((row: any) => row.column_name === 'allocation_mode');
    console.log('\n✓ allocation_mode column exists:', hasAllocationMode);
    
    if (!hasAllocationMode) {
      console.log('\n❌ ERROR: allocation_mode column is missing from enterprises table!');
      console.log('   Run: npm run migrate');
    }
    
  } catch (error) {
    console.error('\n❌ Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();
