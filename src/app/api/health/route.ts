import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers } from '@/lib/db';

// Force this route to be dynamic (not statically generated at build time)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  // Skip database checks during build time
  if (process.env.BUILDING === 'true' || process.env.BUILDING_FOR_CLOUDFLARE === 'true') {
    return NextResponse.json({
      status: 'build-time',
      timestamp: new Date().toISOString(),
      services: {
        database: 'skipped',
        api: 'operational',
      },
    });
  }

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