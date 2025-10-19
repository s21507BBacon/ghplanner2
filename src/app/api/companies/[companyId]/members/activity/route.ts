import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const session = await getServerSession(authOptions as any);
    const s = session as any;
    if (!s || !s.user || !s.userId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
    const userId = s.userId as string;
    const { companyId } = params;

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    // Get company details
    const company = await helpers.findOne<any>('companies', { id: companyId });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check enterprise membership
    if (company.enterprise_id) {
      const membership = await helpers.findOne<any>('enterprise_memberships', {
        user_id: userId,
        enterprise_id: company.enterprise_id
      });
      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this enterprise' }, { status: 403 });
      }
    }

    // Get all projects in this company
    const projects = await helpers.findMany<any>('projects', { company_id: companyId });
    const projectIds = projects.map((p: any) => p.id);

    if (projectIds.length === 0) {
      return NextResponse.json({ members: [] });
    }

    // Get all tasks for these projects
    const allTasks = await helpers.findWhereIn<any>('tasks', 'project_id', projectIds);

    // Get all task IDs
    const taskIds = allTasks.map((t: any) => t.id);

    // Get all comments for these tasks
    let allComments: any[] = [];
    if (taskIds.length > 0) {
      allComments = await helpers.findWhereIn<any>('task_comments', 'task_id', taskIds);
    }

    // Get all assignments for this company
    const assignments = await helpers.findMany<any>('assignments', { company_id: companyId });
    const memberUserIds = Array.from(new Set(assignments.map((a: any) => a.user_id)));

    // Calculate activity scores for each member
    const memberActivity = await Promise.all(
      memberUserIds.map(async (uid: string) => {
        const user = await helpers.findOne<any>('users', { id: uid });
        const userMembership = await helpers.findOne<any>('enterprise_memberships', {
          user_id: uid,
          enterprise_id: company.enterprise_id
        });

        // Count tasks created by user
        const tasksCreated = allTasks.filter((t: any) => t.created_by_user_id === uid).length;
        
        // Count tasks assigned to user (supports assignee string and assignees JSON)
        let tasksAssigned = 0;
        let tasksCompleted = 0;
        allTasks.forEach((t: any) => {
          const ids: string[] = [];
          if (t.assignee) ids.push(t.assignee);
          if (t.assignees) {
            try {
              if (Array.isArray(t.assignees)) ids.push(...t.assignees);
              else if (typeof t.assignees === 'string') {
                const parsed = JSON.parse(t.assignees);
                if (Array.isArray(parsed)) ids.push(...parsed);
              }
            } catch {}
          }
          const isAssigned = ids.includes(uid);
          if (isAssigned) {
            tasksAssigned++;
            if (t.status === 'completed' || t.status === 'merged') tasksCompleted++;
          }
        });

        // Count comments by user
        const commentsCount = allComments.filter((c: any) => c.user_id === uid).length;

        // Count task updates/edits by user using updated_at presence is not per-user; skip or set 0
        const taskUpdates = 0;

        // Get user's project assignments
        const userAssignments = assignments.filter((a: any) => a.user_id === uid);
        const userProjects = userAssignments.map((a: any) => {
          const project = projects.find((p: any) => p.id === a.project_id);
          return {
            projectId: a.project_id,
            projectName: project?.name || 'Unknown',
            assignmentId: a.id
          };
        });

        // Get last activity date (most recent comment or task timestamp)
        const userComments = allComments.filter((c: any) => c.user_id === uid);
        const userTasks = allTasks.filter((t: any) => t.created_by_user_id === uid || tasksAssigned > 0);
        
        const lastCommentDate = userComments.length > 0 
          ? Math.max(...userComments.map((c: any) => {
              const ms = typeof c.created_at === 'number' ? c.created_at * 1000 : new Date(c.created_at || 0).getTime();
              return ms;
            }))
          : 0;
        
        const lastTaskDate = userTasks.length > 0
          ? Math.max(...userTasks.map((t: any) => {
              const a = typeof t.created_at === 'number' ? t.created_at * 1000 : new Date(t.created_at || 0).getTime();
              const b = typeof t.updated_at === 'number' ? t.updated_at * 1000 : new Date(t.updated_at || 0).getTime();
              return Math.max(a, b);
            }))
          : 0;

        const lastActivityDate = Math.max(lastCommentDate, lastTaskDate);

        // Calculate activity score
        const activityScore = 
          tasksCompleted * 10 +
          commentsCount * 2 +
          tasksCreated * 5 +
          tasksAssigned * 3 +
          taskUpdates * 1;

        return {
          userId: uid,
          name: user?.name || 'Unknown',
          email: user?.email || '',
          username: user?.username || '',
          imageUrl: user?.image_url || null,
          role: userMembership?.role || 'member',
          status: userMembership?.status || 'active',
          projects: userProjects,
          activity: {
            tasksCreated,
            tasksAssigned,
            tasksCompleted,
            commentsCount,
            taskUpdates,
            activityScore,
            lastActivityDate: lastActivityDate > 0 ? new Date(lastActivityDate).toISOString() : null
          }
        };
      })
    );

    // Sort by activity score
    const sortedMembers = memberActivity.sort((a, b) => b.activity.activityScore - a.activity.activityScore);

    return NextResponse.json({ members: sortedMembers });
  } catch (e: any) {
    console.error('[GET /api/companies/[companyId]/members/activity] error', e);
    return NextResponse.json({ error: 'Failed to compute member activity', details: String(e?.message || e) }, { status: 500 });
  }
}
