// Database connection - works with both D1 (Cloudflare) and SQLite (local dev)
import type { Database, Statement, BatchStatement } from './db';

// SQLite implementation for local development
class SQLiteDatabase implements Database {
  private sqlite: any;
  private db: any;

  constructor() {
    // Only require better-sqlite3 if not in Cloudflare environment
    if (typeof process !== 'undefined' && !process.env.CF_PAGES) {
      const BetterSqlite3 = require('better-sqlite3');
      const path = require('path');
      const fs = require('fs');

      const dbPath = process.env.SQLITE_DB_PATH || './data/database.sqlite';
      const dbDir = path.dirname(dbPath);

      // Ensure directory exists
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new BetterSqlite3(dbPath);
      
      // Initialize schema if needed
      this.initSchema();
    }
  }

  private initSchema() {
    const fs = require('fs');
    const path = require('path');

    // Check if tables exist
    const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    if (tables.length === 0) {
      // Load and execute schema
      const schemaPath = path.join(process.cwd(), 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        this.db.exec(schema);
        console.log('Database schema initialised');
      }
    }
  }

  prepare(sql: string): Statement {
    const stmt = this.db.prepare(sql);
    let boundValues: any[] = [];

    return {
      bind(...values: any[]) {
        boundValues = values;
        return this;
      },
      async run() {
        const result = stmt.run(...boundValues);
        return { success: true, meta: result };
      },
      async first<T>() {
        const result = stmt.get(...boundValues);
        return result as T | null;
      },
      async all<T>() {
        const results = stmt.all(...boundValues);
        return { results: results as T[] };
      }
    };
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  async batch<T = unknown>(statements: BatchStatement[]): Promise<T[]> {
    const results: T[] = [];
    for (const stmt of statements) {
      const prepared = this.db.prepare(stmt.sql);
      const result = stmt.args ? prepared.run(...stmt.args) : prepared.run();
      results.push(result as T);
    }
    return results;
  }
}

// D1 implementation for Cloudflare Pages
class D1Database implements Database {
  private d1: any;

  constructor(d1Instance: any) {
    this.d1 = d1Instance;
  }

  prepare(sql: string): Statement {
    const stmt = this.d1.prepare(sql);
    return {
      bind(...values: any[]) {
        stmt.bind(...values);
        return this;
      },
      async run() {
        const result = await stmt.run();
        return { success: result.success, meta: result.meta };
      },
      async first<T>() {
        return await stmt.first<T>();
      },
      async all<T>() {
        return await stmt.all<T>();
      }
    };
  }

  exec(sql: string): void {
    this.d1.exec(sql);
  }

  async batch<T = unknown>(statements: BatchStatement[]): Promise<T[]> {
    const preparedStatements = statements.map(stmt => {
      const prepared = this.d1.prepare(stmt.sql);
      return stmt.args ? prepared.bind(...stmt.args) : prepared;
    });
    return await this.d1.batch(preparedStatements);
  }
}

// Try to resolve the Cloudflare Pages (OpenNext) request context at runtime
// and extract the D1 binding (named "DB"). This works when running on
// Cloudflare Pages with the cloudflare-node wrapper from @opennextjs/cloudflare.
function tryGetD1FromOpenNextContext(): any | undefined {
  try {
    // Prefer @cloudflare/next-on-pages if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfNext = require('@cloudflare/next-on-pages');
    if (cfNext && typeof cfNext.getRequestContext === 'function') {
      const ctx = cfNext.getRequestContext();
      return ctx?.env?.DB;
    }
  } catch (err) {
    // Ignore - this simply means we're not running within OpenNext on Cloudflare
  }
  return undefined;
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
export function getDatabase(d1Instance?: any): Database {
  if (cachedDb) {
    return cachedDb;
  }

  // In Cloudflare Pages environment, d1Instance will be provided
  if (d1Instance) {
    cachedDb = new D1Database(d1Instance);
    return cachedDb;
  }

  // Attempt to auto-detect D1 binding via OpenNext request context
  const d1FromCtx = tryGetD1FromOpenNextContext();
  if (d1FromCtx) {
    cachedDb = new D1Database(d1FromCtx);
    return cachedDb;
  }

  // In local development, use SQLite
  if (typeof process !== 'undefined' && !process.env.CF_PAGES) {
    cachedDb = new SQLiteDatabase();
    return cachedDb;
  }

  // During build (CF_PAGES is set, no D1 binding available) return a no-op DB
  console.error('[DB] No D1 binding detected at runtime. Ensure a D1 database is bound as "DB" in Cloudflare Pages → Settings → Functions → D1 Databases.');
  cachedDb = new NoopDatabase();
  return cachedDb;
}

// Helper to get database from Cloudflare context or local
export function getDatabaseFromContext(context?: { env?: { DB?: any } }): Database {
  if (context?.env?.DB) {
    return getDatabase(context.env.DB);
  }
  return getDatabase();
}

export type { Database };

