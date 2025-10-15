import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

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
    const migrationPath = join(process.cwd(), 'database', 'migrations', '004_enhance_member_roles_and_profiles.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Running migration: 004_enhance_member_roles_and_profiles.sql');
    console.log('---');
    console.log('This migration will:');
    console.log('  • Add image_url, username, and last_active_at to users table');
    console.log('  • Expand role types to include new roles');
    console.log('  • Add inactive status option');
    console.log('  • Create project_role_assignments table');
    console.log('  • Create company_role_assignments table');
    console.log('  • Create role_change_audit table');
    console.log('---');

    // Execute the migration
    await sql(migrationSQL);

    console.log('✅ Migration completed successfully!');
    
    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    
    // Check users table columns
    const usersColumns = await sql(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('image_url', 'username', 'last_active_at')
      ORDER BY column_name
    `);

    console.log('\n✅ Users table columns:');
    usersColumns.forEach((col: any) => {
      console.log(`   • ${col.column_name} (${col.data_type})`);
    });

    // Check new tables
    const newTables = await sql(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('project_role_assignments', 'company_role_assignments', 'role_change_audit')
      ORDER BY table_name
    `);

    console.log('\n✅ New tables created:');
    newTables.forEach((table: any) => {
      console.log(`   • ${table.table_name}`);
    });

    // Check role constraint
    const roleConstraint = await sql(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = 'enterprise_memberships_role_check'
    `);

    if (roleConstraint.length > 0) {
      console.log('\n✅ Role constraint updated');
      console.log('   New roles available:');
      console.log('   • owner - Full system access');
      console.log('   • company_admin - Full access over company');
      console.log('   • project_admin - Full access over project');
      console.log('   • project_lead - Edit planner, move tasks');
      console.log('   • code_reviewer - Comment on tasks');
      console.log('   • user - Standard access');
    }

    console.log('\n✨ Migration complete! Your database is ready for the enhanced member features.');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure your DATABASE_URL is set correctly');
    console.error('  2. Ensure you have the necessary permissions');
    console.error('  3. Check if the migration file exists');
    process.exit(1);
  }
}

runMigration();
