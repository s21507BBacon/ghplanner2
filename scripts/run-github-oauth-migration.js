const { neon } = require('@neondatabase/serverless');
const { readFileSync } = require('fs');
const { join } = require('path');

// Load environment variables from .env file
const envPath = join(process.cwd(), '.env');
try {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith("'") && value.endsWith("'")) || 
          (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
  console.log('✅ Loaded environment variables from .env file');
} catch (error) {
  console.log('⚠️  No .env file found, using existing environment variables');
}

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('❌ No database connection string found.');
  console.error('Set DATABASE_URL or NEON_DATABASE_URL environment variable.');
  process.exit(1);
}

async function runMigration() {
  try {
    console.log('🔄 Connecting to Neon PostgreSQL...');
    const sql = neon(connectionString);

    // Read the migration file
    const migrationPath = join(process.cwd(), 'database', 'migrations', '003_add_github_oauth.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Running migration: 003_add_github_oauth.sql');
    console.log('---');
    console.log(migrationSQL);
    console.log('---');

    // Execute the migration
    await sql`
      DO $$
      BEGIN
          -- Add github_access_token column
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name = 'users'
                         AND column_name = 'github_access_token') THEN
              ALTER TABLE users ADD COLUMN github_access_token TEXT;
              RAISE NOTICE 'Added github_access_token column';
          ELSE
              RAISE NOTICE 'github_access_token column already exists';
          END IF;
          
          -- Add github_refresh_token column
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name = 'users'
                         AND column_name = 'github_refresh_token') THEN
              ALTER TABLE users ADD COLUMN github_refresh_token TEXT;
              RAISE NOTICE 'Added github_refresh_token column';
          ELSE
              RAISE NOTICE 'github_refresh_token column already exists';
          END IF;
          
          -- Add github_username column
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name = 'users'
                         AND column_name = 'github_username') THEN
              ALTER TABLE users ADD COLUMN github_username TEXT;
              RAISE NOTICE 'Added github_username column';
          ELSE
              RAISE NOTICE 'github_username column already exists';
          END IF;
          
          -- Add github_connected_at column
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name = 'users'
                         AND column_name = 'github_connected_at') THEN
              ALTER TABLE users ADD COLUMN github_connected_at BIGINT;
              RAISE NOTICE 'Added github_connected_at column';
          ELSE
              RAISE NOTICE 'github_connected_at column already exists';
          END IF;
      END $$;
    `;

    // Create index for GitHub username lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_github_username 
      ON users(github_username) 
      WHERE github_username IS NOT NULL
    `;

    console.log('✅ Migration completed successfully!');
    console.log('✅ GitHub OAuth columns added to users table');
    
    // Verify the columns were added
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('github_access_token', 'github_refresh_token', 'github_username', 'github_connected_at')
      ORDER BY column_name
    `;

    if (result.length > 0) {
      console.log('✅ Verified: GitHub OAuth columns exist');
      result.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('⚠️  Warning: Could not verify columns were added');
    }

    // Verify index was created
    const indexResult = await sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users' 
      AND indexname = 'idx_users_github_username'
    `;

    if (indexResult.length > 0) {
      console.log('✅ Verified: GitHub username index created');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
