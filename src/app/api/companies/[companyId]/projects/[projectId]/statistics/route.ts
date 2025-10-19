import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string; projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions as any);
    const s = session as any;
    if (!s || !s.user || !s.userId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
    const userId = s.userId as string;
    const { companyId, projectId } = params;

    const db = getDatabase();
    const helpers = new DbHelpers(db);

  // Get company details
  const company = await helpers.findOne<any>('companies', { id: companyId });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

    // Check enterprise membership if company is tied to an enterprise
    if (company.enterprise_id) {
      const membership = await helpers.findOne<any>('enterprise_memberships', {
        user_id: userId,
        enterprise_id: company.enterprise_id
      });
      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this enterprise' }, { status: 403 });
      }
    }

  // Get project details
  const project = await helpers.findOne<any>('projects', { id: projectId, company_id: companyId });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Get all tasks for this project
  const tasks = await helpers.findMany<any>('tasks', { project_id: projectId });

  // Calculate task statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.status === 'completed' || t.status === 'merged').length;
  const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length;
  const todoTasks = tasks.filter((t: any) => t.status === 'pending').length;

  // Get all comments for tasks in this project
  const taskIds = tasks.map((t: any) => t.id);
  let allComments: any[] = [];
  if (taskIds.length > 0) {
    allComments = await helpers.findWhereIn<any>('task_comments', 'task_id', taskIds);
  }

  // Count comments by user
  const commentsByUser: Record<string, number> = {};
  allComments.forEach((comment: any) => {
    if (comment.user_id) {
      commentsByUser[comment.user_id] = (commentsByUser[comment.user_id] || 0) + 1;
    }
  });

  // Derive merge/PR stats from tasks (no github_branches table in schema)
  const totalMerges = tasks.filter((t: any) => t.status === 'merged').length;
  const totalBranches = tasks.filter((t: any) => t.pr_url != null).length;

  // Helper to normalise BIGINT/ISO timestamps to ms
  const toMs = (v: any): number | undefined => {
    if (v == null) return undefined;
    if (typeof v === 'number') return v * 1000;
    if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v, 10) * 1000;
    const n = new Date(v).getTime();
    return Number.isNaN(n) ? undefined : n;
  };

  // Get task activity by status over time (group by created date)
  const tasksByDate: Record<string, { created: number; completed: number }> = {};
  tasks.forEach((task: any) => {
    if (task.created_at) {
      const cms = toMs(task.created_at);
      if (cms === undefined) return;
      const date = new Date(cms).toISOString().split('T')[0];
      if (!tasksByDate[date]) {
        tasksByDate[date] = { created: 0, completed: 0 };
      }
      tasksByDate[date].created++;
    }
    if ((task.status === 'completed' || task.status === 'merged') && task.updated_at) {
      const ums = toMs(task.updated_at);
      if (ums === undefined) return;
      const completedDate = new Date(ums).toISOString().split('T')[0];
      if (!tasksByDate[completedDate]) {
        tasksByDate[completedDate] = { created: 0, completed: 0 };
      }
      tasksByDate[completedDate].completed++;
    }
  });

  // Sort dates
  const sortedDates = Object.keys(tasksByDate).sort();
  const taskTimeline = sortedDates.map(date => ({
    date,
    created: tasksByDate[date].created,
    completed: tasksByDate[date].completed
  }));

  // Get comment activity over time
  const commentsByDate: Record<string, number> = {};
  allComments.forEach((comment: any) => {
    if (comment.created_at) {
      const ms = toMs(comment.created_at);
      if (ms === undefined) return;
      const date = new Date(ms).toISOString().split('T')[0];
      commentsByDate[date] = (commentsByDate[date] || 0) + 1;
    }
  });

  const commentTimeline = Object.keys(commentsByDate)
    .sort()
    .map(date => ({
      date,
      count: commentsByDate[date]
    }));

  // Get top contributors (by task assignments and comments)
  const taskAssignments: Record<string, number> = {};
  tasks.forEach((task: any) => {
    const ids: string[] = [];
    if (task.assignee) ids.push(task.assignee);
    if (task.assignees) {
      try {
        if (Array.isArray(task.assignees)) ids.push(...task.assignees);
        else if (typeof task.assignees === 'string') {
          const parsed = JSON.parse(task.assignees);
          if (Array.isArray(parsed)) ids.push(...parsed);
        }
      } catch {}
    }
    ids.forEach(uid => {
      taskAssignments[uid] = (taskAssignments[uid] || 0) + 1;
    });
  });

  const contributorScores: Record<string, { tasks: number; comments: number; total: number }> = {};
  
  Object.keys(taskAssignments).forEach(userId => {
    if (!contributorScores[userId]) {
      contributorScores[userId] = { tasks: 0, comments: 0, total: 0 };
    }
    contributorScores[userId].tasks = taskAssignments[userId];
  });

  Object.keys(commentsByUser).forEach(userId => {
    if (!contributorScores[userId]) {
      contributorScores[userId] = { tasks: 0, comments: 0, total: 0 };
    }
    contributorScores[userId].comments = commentsByUser[userId];
  });

  Object.keys(contributorScores).forEach(userId => {
    contributorScores[userId].total = 
      contributorScores[userId].tasks * 5 + contributorScores[userId].comments;
  });

  // Get user details for contributors
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

    return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description
    },
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
      topContributors
    }
    });
  } catch (e: any) {
    console.error('[GET /api/companies/[companyId]/projects/[projectId]/statistics] error', e);
    return NextResponse.json({ error: 'Failed to load project statistics', details: String(e?.message || e) }, { status: 500 });
  }
}
