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

  // Get company and verify access (enterprise membership)
  const company = await helpers.findOne<any>('companies', { id: companyId });
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

  if (company.enterprise_id) {
    const membership = await helpers.findOne<any>('enterprise_memberships', {
      user_id: userId,
      enterprise_id: company.enterprise_id
    });
    if (!membership) return NextResponse.json({ error: 'Not a member of this enterprise' }, { status: 403 });
  }

  // Collect all projects in the company
  const projects = await helpers.findMany<any>('projects', { company_id: companyId });
  const projectIds = projects.map((p: any) => p.id);

  // If no projects, return empty stats
  if (projectIds.length === 0) {
    return NextResponse.json({
      company: { id: company.id, name: company.name, enterpriseId: company.enterprise_id },
      statistics: {
        tasks: { total: 0, completed: 0, inProgress: 0, todo: 0, completionRate: 0 },
        merges: { total: 0, totalBranches: 0 },
        comments: { total: 0, byUser: {}, timeline: [] },
        timeline: [],
        topContributors: [],
        byProject: []
      }
    });
  }

  // Tasks across all projects
  const tasks = await helpers.findWhereIn<any>('tasks', 'project_id', projectIds);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.status === 'completed' || t.status === 'merged').length;
  const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length;
  const todoTasks = tasks.filter((t: any) => t.status === 'pending').length;

  // Comments across all tasks
  const taskIds = tasks.map((t: any) => t.id);
  let allComments: any[] = [];
  if (taskIds.length > 0) {
    allComments = await helpers.findWhereIn<any>('task_comments', 'task_id', taskIds);
  }

  const commentsByUser: Record<string, number> = {};
  const commentsByDate: Record<string, number> = {};
  const toMs = (v: any): number | undefined => {
    if (v == null) return undefined;
    if (typeof v === 'number') return v * 1000;
    if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v, 10) * 1000;
    const n = new Date(v).getTime();
    return Number.isNaN(n) ? undefined : n;
  };

  allComments.forEach((c: any) => {
    if (c.user_id) commentsByUser[c.user_id] = (commentsByUser[c.user_id] || 0) + 1;
    if (c.created_at) {
      const ms = toMs(c.created_at);
      const d = new Date(ms).toISOString().split('T')[0];
      commentsByDate[d] = (commentsByDate[d] || 0) + 1;
    }
  });

  // Merges derived from tasks (no github_branches table in schema)
  const totalMerges = tasks.filter((t: any) => t.status === 'merged').length;
  const totalBranches = tasks.filter((t: any) => t.pr_url != null).length;

  // Task timeline (created/completed per date)
  const tasksByDate: Record<string, { created: number; completed: number }> = {};
  tasks.forEach((t: any) => {
    if (t.created_at) {
      const cms = toMs(t.created_at);
      const cd = new Date(cms).toISOString().split('T')[0];
      if (!tasksByDate[cd]) tasksByDate[cd] = { created: 0, completed: 0 };
      tasksByDate[cd].created++;
    }
    if ((t.status === 'completed' || t.status === 'merged') && t.updated_at) {
      const ums = toMs(t.updated_at);
      const dd = new Date(ums).toISOString().split('T')[0];
      if (!tasksByDate[dd]) tasksByDate[dd] = { created: 0, completed: 0 };
      tasksByDate[dd].completed++;
    }
  });
  const taskTimeline = Object.keys(tasksByDate).sort().map(d => ({ date: d, ...tasksByDate[d] }));
  const commentTimeline = Object.keys(commentsByDate).sort().map(d => ({ date: d, count: commentsByDate[d] }));

  // Contributor scores (tasks assigned + comments)
  const taskAssignments: Record<string, number> = {};
  tasks.forEach((t: any) => {
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
    ids.forEach(uid => {
      taskAssignments[uid] = (taskAssignments[uid] || 0) + 1;
    });
  });

  const contributorScores: Record<string, { tasks: number; comments: number; total: number }> = {};
  Object.keys(taskAssignments).forEach(uid => {
    contributorScores[uid] = contributorScores[uid] || { tasks: 0, comments: 0, total: 0 };
    contributorScores[uid].tasks = taskAssignments[uid];
  });
  Object.keys(commentsByUser).forEach(uid => {
    contributorScores[uid] = contributorScores[uid] || { tasks: 0, comments: 0, total: 0 };
    contributorScores[uid].comments = commentsByUser[uid];
  });
  Object.keys(contributorScores).forEach(uid => {
    contributorScores[uid].total = contributorScores[uid].tasks * 5 + contributorScores[uid].comments;
  });

  const contributorIds = Object.keys(contributorScores);
  const contributors = await Promise.all(
    contributorIds.map(async (uid: string) => {
      const user = await helpers.findOne<any>('users', { id: uid });
      return {
        userId: uid,
        name: user?.name || 'Unknown',
        imageUrl: user?.image_url || null,
        tasks: contributorScores[uid].tasks,
        comments: contributorScores[uid].comments,
        score: contributorScores[uid].total
      };
    })
  );
  const topContributors = contributors.sort((a, b) => b.score - a.score).slice(0, 10);

  // Per-project breakdown
  const byProject = projects.map((p: any) => {
    const pTasks = tasks.filter((t: any) => t.project_id === p.id);
    const pTotal = pTasks.length;
    const pCompleted = pTasks.filter((t: any) => t.status === 'completed' || t.status === 'merged').length;
    const pInProgress = pTasks.filter((t: any) => t.status === 'in_progress').length;
    const pTodo = pTasks.filter((t: any) => t.status === 'pending').length;
    const pCompletionRate = pTotal > 0 ? Math.round((pCompleted / pTotal) * 100) : 0;
    return {
      id: p.id,
      name: p.name,
      total: pTotal,
      completed: pCompleted,
      inProgress: pInProgress,
      todo: pTodo,
      completionRate: pCompletionRate
    };
  });

  return NextResponse.json({
    company: { id: company.id, name: company.name, enterpriseId: company.enterprise_id },
    statistics: {
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        todo: todoTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      merges: {
        total: totalMerges,
        totalBranches
      },
      comments: {
        total: allComments.length,
        byUser: commentsByUser,
        timeline: commentTimeline
      },
      timeline: taskTimeline,
      topContributors,
      byProject
    }
  });
  } catch (e: any) {
    console.error('[GET /api/companies/[companyId]/statistics] error', e);
    return NextResponse.json({ error: 'Failed to load company statistics', details: String(e?.message || e) }, { status: 500 });
  }
}
