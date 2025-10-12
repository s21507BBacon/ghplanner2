// Database connection - works with Neon PostgreSQL
import { neon, neonConfig } from '@neondatabase/serverless';
import type { Database, Statement, BatchStatement } from './db';

// Enable connection pooling for better performance
neonConfig.fetchConnectionCache = true;

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
      async run() { throw new Error('Database not available at build time'); },
      async first() { throw new Error('Database not available at build time'); },
      async all() { throw new Error('Database not available at build time'); }
    } as unknown as Statement;
  }
  exec(_sql: string): void {
    throw new Error('Database not available at build time');
  }
  async batch<T = unknown>(_statements: BatchStatement[]): Promise<T[]> {
    throw new Error('Database not available at build time');
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
    cachedDb = new NoopDatabase();
    return cachedDb;
  }

  // Get Neon connection string from environment
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.NEON_DATABASE_URL;

  if (!connectionString) {
    console.error('[DB] No Neon database connection string found. Set DATABASE_URL or NEON_DATABASE_URL environment variable.');
    cachedDb = new NoopDatabase();
    return cachedDb;
  }

  cachedDb = new NeonDatabase(connectionString);
  return cachedDb;
}

// Helper to get database from context (for compatibility)
export function getDatabaseFromContext(context?: any): Database {
  return getDatabase();
}

export type { Database };
