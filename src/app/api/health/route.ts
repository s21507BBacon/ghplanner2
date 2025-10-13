import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers } from '@/lib/db';

// Force this route to be dynamic (not statically generated at build time)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const detailed = url.searchParams.get('detailed') === 'true';

  // Skip database checks during build time
  if (process.env.BUILDING === 'true' || process.env.BUILDING_FOR_CLOUDFLARE === 'true') {
    if (detailed) {
      return NextResponse.json({
        status: 'build-time',
        timestamp: new Date().toISOString(),
        services: {
          database: 'skipped',
          api: 'operational',
        },
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
          NEON_DATABASE_URL: process.env.NEON_DATABASE_URL ? 'Set' : 'Not set',
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'Set' : 'Not set',
          JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
          RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Not set',
          EMAIL_FROM: process.env.EMAIL_FROM || 'Not set',
          GITHUB_TOKEN: process.env.GITHUB_TOKEN ? 'Set' : 'Not set',
          APP_URL: process.env.APP_URL || 'Not set',
        }
      });
    }

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

    const diagnostics = {
      status: 'unknown',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
        NEON_DATABASE_URL: process.env.NEON_DATABASE_URL ? 'Set' : 'Not set',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'Set' : 'Not set',
        JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Not set',
        EMAIL_FROM: process.env.EMAIL_FROM || 'Not set',
        GITHUB_TOKEN: process.env.GITHUB_TOKEN ? 'Set' : 'Not set',
        APP_URL: process.env.APP_URL || 'Not set',
      },
      cloudflare: {
        context: 'unknown',
        env: 'unknown'
      },
      services: {
        database: 'unknown',
        api: 'operational',
      }
    };

    // Check Cloudflare context
    try {
      const globalAny = globalThis as any;
      const symbol = Symbol.for('__cloudflare-request-context__');

      if (globalAny[symbol]) {
        diagnostics.cloudflare.context = 'available';
        if (globalAny[symbol].env) {
          diagnostics.cloudflare.env = 'available';
        }
      } else {
        diagnostics.cloudflare.context = 'not available';
      }
    } catch (e) {
      diagnostics.cloudflare.context = 'error';
    }

    console.log('Getting database...');
    const db = getDatabase();
    console.log('Database instance created');

    console.log('Creating helpers...');
    const helpers = new DbHelpers(db);
    console.log('Helpers created');

    console.log('Executing query...');
    await helpers.execute('SELECT 1');
    console.log('Query executed successfully');

    diagnostics.status = 'healthy';
    diagnostics.services.database = 'connected';

    if (detailed) {
      return NextResponse.json(diagnostics);
    }

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

    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'error',
        api: 'operational',
      },
      error: error?.message || 'Database connection failed',
    };

    if (detailed) {
      // Add diagnostics to error response
      const diagnostics = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
          NEON_DATABASE_URL: process.env.NEON_DATABASE_URL ? 'Set' : 'Not set',
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'Set' : 'Not set',
          JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
          RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Not set',
          EMAIL_FROM: process.env.EMAIL_FROM || 'Not set',
          GITHUB_TOKEN: process.env.GITHUB_TOKEN ? 'Set' : 'Not set',
          APP_URL: process.env.APP_URL || 'Not set',
        },
        cloudflare: {
          context: 'unknown',
          env: 'unknown'
        },
        services: {
          database: 'error',
          api: 'operational',
        },
        error: error?.message || 'Database connection failed',
        fullError: String(error)
      };

      // Check Cloudflare context
      try {
        const globalAny = globalThis as any;
        const symbol = Symbol.for('__cloudflare-request-context__');

        if (globalAny[symbol]) {
          diagnostics.cloudflare.context = 'available';
          if (globalAny[symbol].env) {
            diagnostics.cloudflare.env = 'available';
          }
        } else {
          diagnostics.cloudflare.context = 'not available';
        }
      } catch (e) {
        diagnostics.cloudflare.context = 'error';
      }

      return NextResponse.json(diagnostics, { status: 503 });
    }

    return NextResponse.json(errorResponse, { status: 503 });
  }
}