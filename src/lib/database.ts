// Database connection - works with Neon PostgreSQL
import { neon } from '@neondatabase/serverless';
import type { Database, Statement, BatchStatement } from './db';

// Neon PostgreSQL implementation
class NeonDatabase implements Database {
  private sql: ReturnType<typeof neon>;

  constructor(connectionString: string) {
    this.sql = neon(connectionString);
  }

  prepare(sql: string): Statement {
    let boundValues: any[] = [];
    const sqlClient = this.sql; // Capture sql client reference

    return {
      bind(...values: any[]) {
        boundValues = values;
        return this;
      },
      async run() {
        try {
          await sqlClient.query(sql, boundValues);
          return { success: true, meta: {} };
        } catch (error) {
          console.error('Database run error:', error);
          throw error;
        }
      },
      async first<T>() {
        try {
          const results = await sqlClient.query(sql, boundValues);
          return (results[0] as T) || null;
        } catch (error) {
          console.error('Database first error:', error);
          throw error;
        }
      },
      async all<T>() {
        try {
          const results = await sqlClient.query(sql, boundValues);
          return { results: results as T[] };
        } catch (error) {
          console.error('Database all error:', error);
          throw error;
        }
      }
    };
  }

  exec(sql: string): void {
    // PostgreSQL doesn't support synchronous exec
    throw new Error('Use prepare().run() instead of exec()');
  }

  async batch<T = unknown>(statements: BatchStatement[]): Promise<T[]> {
    const results: T[] = [];
    // Execute statements sequentially (Neon doesn't have native batch API)
    for (const stmt of statements) {
      const result = await this.sql.query(stmt.sql, stmt.args || []);
      results.push(result as T);
    }
    return results;
  }
}

// No-op database used during build time to avoid initialising a real DB
class NoopDatabase implements Database {
  prepare(_sql: string) {
    return {
      bind() { return this; },
      async run() { 
        console.error('[DB] NoopDatabase: Database not available - check environment configuration');
        throw new Error('Database not available - check environment configuration'); 
      },
      async first() { 
        console.error('[DB] NoopDatabase: Database not available - check environment configuration');
        throw new Error('Database not available - check environment configuration'); 
      },
      async all() { 
        console.error('[DB] NoopDatabase: Database not available - check environment configuration');
        throw new Error('Database not available - check environment configuration'); 
      }
    } as unknown as Statement;
  }
  exec(_sql: string): void {
    console.error('[DB] NoopDatabase: Database not available - check environment configuration');
    throw new Error('Database not available - check environment configuration');
  }
  async batch<T = unknown>(_statements: BatchStatement[]): Promise<T[]> {
    console.error('[DB] NoopDatabase: Database not available - check environment configuration');
    throw new Error('Database not available - check environment configuration');
  }
}

let cachedDb: Database | null = null;

// Get database instance
export function getDatabase(): Database {
  if (cachedDb) {
    return cachedDb;
  }

  // During build time, return no-op database
  if (process.env.BUILDING === 'true' || process.env.BUILDING_FOR_CLOUDFLARE === 'true') {
    console.log('[DB] Build time detected, returning no-op database');
    cachedDb = new NoopDatabase();
    return cachedDb;
  }

  // Get Neon connection string from environment
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.NEON_DATABASE_URL;

  console.log('[DB] Environment check:', {
    hasDATABASE_URL: !!process.env.DATABASE_URL,
    hasNEON_DATABASE_URL: !!process.env.NEON_DATABASE_URL,
    hasConnectionString: !!connectionString,
    connectionStringPrefix: connectionString ? connectionString.substring(0, 20) + '...' : 'none'
  });

  if (!connectionString) {
    console.error('[DB] No Neon database connection string found. Set DATABASE_URL or NEON_DATABASE_URL environment variable.');
    console.error('[DB] Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('NEON')));
    cachedDb = new NoopDatabase();
    return cachedDb;
  }

  console.log('[DB] Creating NeonDatabase instance');
  cachedDb = new NeonDatabase(connectionString);
  console.log('[DB] NeonDatabase instance created successfully');
  return cachedDb;
}

// Helper to get database from context (for compatibility)
export function getDatabaseFromContext(context?: any): Database {
  return getDatabase();
}

export type { Database };
