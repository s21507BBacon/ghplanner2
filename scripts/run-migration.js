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
    const migrationPath = join(process.cwd(), 'database', 'migrations', 'add_image_url_to_comments.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Running migration: add_image_url_to_comments.sql');
    console.log('---');
    console.log(migrationSQL);
    console.log('---');

    // Execute the migration using tagged template
    await sql`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name = 'task_comments'
                         AND column_name = 'image_url') THEN
              ALTER TABLE task_comments ADD COLUMN image_url TEXT;
          END IF;
      END $$;
    `;

    console.log('✅ Migration completed successfully!');
    console.log('✅ image_url column added to task_comments table');
    
    // Verify the column was added
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'task_comments' 
      AND column_name = 'image_url'
    `;

    if (result.length > 0) {
      console.log('✅ Verified: image_url column exists');
      console.log(`   Type: ${result[0].data_type}`);
    } else {
      console.log('⚠️  Warning: Could not verify column was added');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
