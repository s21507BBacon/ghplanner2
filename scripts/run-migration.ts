import { Pool } from '@neondatabase/serverless';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
  console.log('✅ Loaded environment variables from .env file');
}

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('❌ No database connection string found.');
  console.error('Set DATABASE_URL or NEON_DATABASE_URL environment variable.');
  process.exit(1);
}

// Create migrations tracking table
async function ensureMigrationsTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      executed_at BIGINT NOT NULL
    )
  `);
}

// Get list of executed migrations
async function getExecutedMigrations(pool: Pool): Promise<string[]> {
  const result = await pool.query(
    'SELECT filename FROM schema_migrations ORDER BY executed_at'
  );
  return result.rows.map((row: any) => row.filename);
}

// Record migration as executed
async function recordMigration(pool: Pool, filename: string) {
  await pool.query(
    'INSERT INTO schema_migrations (filename, executed_at) VALUES ($1, $2)',
    [filename, Date.now()]
  );
}

async function runMigrations() {
  const pool = new Pool({ connectionString });
  
  try {
    console.log('🔄 Connecting to Neon PostgreSQL...');

    // Ensure migrations tracking table exists
    await ensureMigrationsTable(pool);

    // Get all migration files
    const migrationsDir = join(process.cwd(), 'database', 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure consistent order

    if (files.length === 0) {
      console.log('ℹ️  No migration files found in database/migrations/');
      return;
    }

    // Get already executed migrations
    const executedMigrations = await getExecutedMigrations(pool);

    // Find pending migrations
    const pendingMigrations = files.filter(file => !executedMigrations.includes(file));

    if (pendingMigrations.length === 0) {
      console.log('✅ All migrations are up to date!');
      console.log(`📊 Total migrations: ${files.length}`);
      console.log(`✓ Executed: ${executedMigrations.length}`);
      return;
    }

    console.log(`\n📋 Found ${pendingMigrations.length} pending migration(s):\n`);
    pendingMigrations.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('');

    // Run each pending migration
    for (const file of pendingMigrations) {
      console.log(`🔄 Running migration: ${file}`);
      
      const migrationPath = join(migrationsDir, file);
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      try {
        // Execute the migration
        await pool.query(migrationSQL);
        
        // Record as executed
        await recordMigration(pool, file);
        
        console.log(`✅ ${file} - SUCCESS\n`);
      } catch (error) {
        console.error(`❌ ${file} - FAILED`);
        console.error('Error:', error);
        console.error('\n⚠️  Migration stopped. Fix the error and run again.');
        process.exit(1);
      }
    }

    console.log('🎉 All migrations completed successfully!');
    console.log(`📊 Total migrations executed: ${pendingMigrations.length}`);
    console.log(`📊 Total migrations in database: ${executedMigrations.length + pendingMigrations.length}`);

  } catch (error) {
    console.error('\n❌ Migration process failed:', error);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure your DATABASE_URL is set correctly in .env');
    console.error('  2. Ensure you have the necessary database permissions');
    console.error('  3. Check if migration files exist in database/migrations/');
    console.error('  4. Verify your SQL syntax in the migration files');
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch (e) {
      // Ignore errors when closing pool
    }
  }
}

runMigrations();
