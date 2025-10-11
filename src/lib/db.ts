// Database abstraction layer for both D1 (Cloudflare Pages) and SQLite (local dev)
// This provides a unified interface regardless of environment

type DatabaseRow = Record<string, any>;

export interface Database {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  batch<T = unknown>(statements: BatchStatement[]): Promise<T[]>;
}

export interface Statement {
  bind(...values: any[]): Statement;
  run(): Promise<{ success: boolean; meta?: any }>;
  first<T = DatabaseRow>(): Promise<T | null>;
  all<T = DatabaseRow>(): Promise<{ results: T[] }>;
}

export interface BatchStatement {
  sql: string;
  args?: any[];
}

// Helper functions for working with the database
export class DbHelpers {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  // Find one record
  async findOne<T = DatabaseRow>(
    table: string,
    where: Record<string, any>
  ): Promise<T | null> {
    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');
    const values = Object.values(where);

    const stmt = this.db
      .prepare(`SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`)
      .bind(...values);

    return stmt.first<T>();
  }

  // Find many records
  async findMany<T = DatabaseRow>(
    table: string,
    where?: Record<string, any>,
    orderBy?: string
  ): Promise<T[]> {
    let sql = `SELECT * FROM ${table}`;
    const values: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const whereClause = Object.keys(where)
        .map((key) => `${key} = ?`)
        .join(' AND ');
      values.push(...Object.values(where));
      sql += ` WHERE ${whereClause}`;
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    const stmt = this.db.prepare(sql);
    if (values.length > 0) {
      stmt.bind(...values);
    }

    const result = await stmt.all<T>();
    return result.results;
  }

  // Insert a record
  async insert(table: string, data: Record<string, any>): Promise<void> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    await this.db.prepare(sql).bind(...values).run();
  }

  // Update a record
  async update(
    table: string,
    where: Record<string, any>,
    data: Record<string, any>
  ): Promise<void> {
    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');
    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');

    const values = [...Object.values(data), ...Object.values(where)];
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;

    await this.db.prepare(sql).bind(...values).run();
  }

  // Delete a record
  async delete(table: string, where: Record<string, any>): Promise<void> {
    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');
    const values = Object.values(where);

    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    await this.db.prepare(sql).bind(...values).run();
  }

  // Execute raw SQL
  async execute<T = DatabaseRow>(sql: string, ...values: any[]): Promise<T[]> {
    const stmt = this.db.prepare(sql).bind(...values);
    const result = await stmt.all<T>();
    return result.results;
  }

  // Execute raw SQL and get first result
  async executeOne<T = DatabaseRow>(sql: string, ...values: any[]): Promise<T | null> {
    const stmt = this.db.prepare(sql).bind(...values);
    return stmt.first<T>();
  }

  // Find with $in operator
  async findWhereIn<T = DatabaseRow>(
    table: string,
    field: string,
    values: any[],
    additionalWhere?: Record<string, any>
  ): Promise<T[]> {
    if (values.length === 0) {
      return [];
    }

    const placeholders = values.map(() => '?').join(', ');
    let sql = `SELECT * FROM ${table} WHERE ${field} IN (${placeholders})`;
    const allValues = [...values];

    if (additionalWhere && Object.keys(additionalWhere).length > 0) {
      const whereClause = Object.keys(additionalWhere)
        .map((key) => `${key} = ?`)
        .join(' AND ');
      sql += ` AND ${whereClause}`;
      allValues.push(...Object.values(additionalWhere));
    }

    const stmt = this.db.prepare(sql).bind(...allValues);
    const result = await stmt.all<T>();
    return result.results;
  }
}

// Utility functions for date conversions (SQLite stores dates as integers - Unix timestamps)
export function dateToTimestamp(date: Date | string): number {
  if (typeof date === 'string') {
    return Math.floor(new Date(date).getTime() / 1000);
  }
  return Math.floor(date.getTime() / 1000);
}

export function timestampToDate(timestamp: number | null | undefined): Date | undefined {
  if (timestamp == null) return undefined;
  return new Date(timestamp * 1000);
}

// Helper to convert boolean to integer for SQLite
export function boolToInt(value: boolean | undefined): number {
  return value ? 1 : 0;
}

// Helper to convert integer to boolean from SQLite
export function intToBool(value: number | null | undefined): boolean {
  return value === 1;
}

// Helper to parse JSON fields
export function parseJsonField<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

// Helper to stringify JSON fields
export function stringifyJsonField<T>(value: T): string {
  return JSON.stringify(value);
}

