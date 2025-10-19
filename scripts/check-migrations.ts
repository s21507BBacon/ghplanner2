import { Pool } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

// Load environment variables
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
}

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

async function checkMigrations() {
  const pool = new Pool({ connectionString });
  
  try {
    // Get executed migrations
    const result = await pool.query(`
      SELECT filename, executed_at
      FROM schema_migrations
      ORDER BY executed_at;
    `);
    
    console.log('\n📋 Executed migrations in database:');
    console.log('====================================');
    result.rows.forEach((row: any, index: number) => {
      console.log(`  ${index + 1}. ${row.filename}`);
    });
    console.log(`\nTotal: ${result.rows.length}`);
    
    // Get migration files
    const migrationsDir = join(process.cwd(), 'database', 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log('\n📂 Migration files on disk:');
    console.log('============================');
    files.forEach((file, index) => {
      const executed = result.rows.some((row: any) => row.filename === file);
      console.log(`  ${index + 1}. ${file} ${executed ? '✓' : '✗ NOT EXECUTED'}`);
    });
    console.log(`\nTotal: ${files.length}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkMigrations();
