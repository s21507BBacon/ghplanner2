import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { DbHelpers } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ canComment: false }, { status: 200 });
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);
    
    // Get the task to find its projectId
    const task = await helpers.findOne<any>('tasks', { id: params.id });
    
    if (!task) {
      return NextResponse.json({ canComment: false }, { status: 404 });
    }

    // Get user by email
    const user = await helpers.findOne<any>('users', { email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ canComment: false }, { status: 200 });
    }

    const userId = user.id;

    // If task has no project, allow any authenticated user to comment
    if (!task.project_id) {
      return NextResponse.json({ canComment: true }, { status: 200 });
    }

    // Check if user is allocated to the project
    const assignment = await helpers.findOne<any>('assignments', {
      user_id: userId,
      project_id: task.project_id,
    });

    if (assignment) {
      return NextResponse.json({ canComment: true }, { status: 200 });
    }

    // Check if user is admin/owner of the company
    if (task.company_id) {
      const membership = await db.prepare(
        `SELECT * FROM memberships WHERE user_id = ? AND company_id = ? AND role IN ('owner', 'admin') AND status = 'active' LIMIT 1`
      ).bind(userId, task.company_id).first();

      if (membership) {
        return NextResponse.json({ canComment: true }, { status: 200 });
      }
    }

    // Check if user is enterprise creator (if task has enterprise context)
    // Note: tasks don't have enterprise_id in schema, but we can check through company
    if (task.company_id) {
      const company = await helpers.findOne<any>('companies', { id: task.company_id });
      
      if (company?.enterprise_id) {
        const enterprise = await helpers.findOne<any>('enterprises', {
          id: company.enterprise_id,
          owner_user_id: userId,
        });

        if (enterprise) {
          return NextResponse.json({ canComment: true }, { status: 200 });
        }

        // Check if user is enterprise admin
        const enterpriseMembership = await db.prepare(
          `SELECT * FROM enterprise_memberships WHERE user_id = ? AND enterprise_id = ? AND role IN ('owner', 'admin') AND status = 'active' LIMIT 1`
        ).bind(userId, company.enterprise_id).first();

        if (enterpriseMembership) {
          return NextResponse.json({ canComment: true }, { status: 200 });
        }
      }
    }

    return NextResponse.json({ canComment: false }, { status: 200 });
  } catch (error) {
    console.error('Error checking comment permission:', error);
    return NextResponse.json(
      { canComment: false, error: 'Failed to check permission' },
      { status: 500 }
    );
  }
}
