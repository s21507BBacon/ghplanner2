# Database Migrations

This directory contains all database migration files for the GitHub Planner application.

## How It Works

The migration system automatically:
1. Tracks which migrations have been executed in a `schema_migrations` table
2. Runs only new migrations that haven't been executed yet
3. Executes migrations in alphabetical order (use numbered prefixes)
4. Records each successful migration to prevent re-running

## Running Migrations

Simply run:

```bash
npm run migrate
```

This will:
- Check for any new `.sql` files in this directory
- Run only the migrations that haven't been executed yet
- Show you which migrations were run
- Skip migrations that have already been executed

## Adding a New Migration

1. Create a new `.sql` file in this directory with a numbered prefix:
   ```
   001_initial_schema.sql
   002_add_user_fields.sql
   003_add_github_oauth.sql
   004_enhance_member_roles_and_profiles.sql
   005_your_new_migration.sql
   ```

2. Write your SQL migration code in the file

3. Run `npm run migrate`

That's it! The system will automatically detect and run your new migration.

## Migration File Naming Convention

Use this format: `###_descriptive_name.sql`

- `###` - Three-digit number (001, 002, 003, etc.)
- `_` - Underscore separator
- `descriptive_name` - Brief description of what the migration does
- `.sql` - File extension

Examples:
- `001_initial_schema.sql`
- `002_add_user_profiles.sql`
- `003_create_audit_tables.sql`

## Best Practices

1. **Never modify executed migrations** - Once a migration has been run in production, create a new migration to make changes
2. **Make migrations idempotent** - Use `IF NOT EXISTS`, `IF EXISTS`, etc. when possible
3. **Test migrations** - Always test on a development database first
4. **Keep migrations small** - One logical change per migration file
5. **Add comments** - Explain complex changes in your SQL files

## Current Migrations

- `003_add_github_oauth.sql` - Adds GitHub OAuth support
- `004_enhance_member_roles_and_profiles.sql` - Adds new role system, profile images, and activity tracking
- `add_image_url_to_comments.sql` - Adds image support to task comments

## Troubleshooting

### Migration fails
- Check your DATABASE_URL in `.env`
- Verify SQL syntax in the migration file
- Check database permissions
- Look at the error message for specific issues

### Need to re-run a migration
If you need to re-run a migration (in development only):
```sql
DELETE FROM schema_migrations WHERE filename = 'your_migration.sql';
```
Then run `npm run migrate` again.

### Check migration status
To see which migrations have been executed:
```sql
SELECT * FROM schema_migrations ORDER BY executed_at;
```
