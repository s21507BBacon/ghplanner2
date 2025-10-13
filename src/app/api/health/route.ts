import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers } from '@/lib/db';

export async function GET() {
  try {
    console.log('Health check starting...');

    console.log('Getting database...');
    const db = getDatabase();
    console.log('Database instance created');

    console.log('Creating helpers...');
    const helpers = new DbHelpers(db);
    console.log('Helpers created');

    console.log('Executing query...');
    await helpers.execute('SELECT 1');
    console.log('Query executed successfully');

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'operational',
      },
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    console.error('Error message:', error?.message);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'error',
          api: 'operational',
        },
        error: error?.message || 'Database connection failed',
      },
      { status: 503 }
    );
  }
}