import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { Task } from '@/lib/types';
import { parsePRUrl } from '@/lib/github';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const boardId = searchParams.get('boardId');
  const projectId = searchParams.get('projectId');

  if (!boardId) {
    return NextResponse.json(
      { error: 'Missing required parameter: boardId' },
      { status: 400 }
    );
  }

  try {
    const db = getDatabase();
    const helpers = new DbHelpers(db);
    const query: any = { board_id: boardId };
    if (projectId) query.project_id = projectId;
    const tasks = await helpers.findMany<any>('tasks', query, 'created_at DESC');

    return NextResponse.json({
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        columnId: task.column_id,
        status: task.status,
        labels: task.labels ? JSON.parse(task.labels) : [],
        prUrl: task.pr_url || undefined,
        assignee: task.assignee || undefined,
        assignees: task.assignees ? JSON.parse(task.assignees) : (task.assignee ? [task.assignee] : []),
        isLocked: !!task.is_locked,
        created_at: new Date(task.created_at * 1000).toISOString(),
        updated_at: new Date(task.updated_at * 1000).toISOString(),
        checklist: task.checklist ? JSON.parse(task.checklist) : [],
        order: task.order_num || 0,
        companyId: task.company_id || undefined,
        projectId: task.project_id || undefined,
      })),
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.userId as string | undefined;
    const body = await request.json();
    const { title, description, columnId, status, labels, prUrl, prNumber, assignee, assignees, boardId, companyId, projectId, isLocked } = body as any;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!boardId || typeof boardId !== 'string') {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      );
    }

    if (!columnId || typeof columnId !== 'string') {
      return NextResponse.json(
        { error: 'Column ID is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'blocked', 'approved', 'merged', 'changes_requested'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Validate prUrl if provided (or try to build from prNumber + project repo)
    let finalPrUrl: string | undefined = prUrl?.trim() || undefined;
    if (!finalPrUrl && prNumber && projectId) {
      const db = getDatabase();
      const helpers = new DbHelpers(db);
      const proj: any = await helpers.findOne('projects', { id: projectId });
      if (proj && proj.repo_owner && proj.repo_name && typeof prNumber === 'number') {
        finalPrUrl = `https://github.com/${proj.repo_owner}/${proj.repo_name}/pull/${prNumber}`;
      }
    }

    if (finalPrUrl && !parsePRUrl(finalPrUrl)) {
      return NextResponse.json(
        { 
          error: 'Invalid PR URL format',
          hint: 'Expected format: https://github.com/owner/repo/pull/123',
          received: finalPrUrl
        },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    // Get the next order number for this column
    const existing = await helpers.findMany<any>('tasks', { column_id: columnId }, 'order_num DESC');
    const nextOrder = (existing[0]?.order_num || 0) + 1;
    const now = new Date();

    const task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description?.trim() || '',
      column_id: columnId,
      status: status || 'pending',
      labels: JSON.stringify(Array.isArray(labels) ? labels.filter(l => typeof l === 'string' && l.trim()) : []),
      pr_url: finalPrUrl || null,
      assignee: assignee?.trim() || null,
      assignees: JSON.stringify(Array.isArray(assignees) ? assignees : (assignee?.trim() ? [assignee.trim()] : [])),
      board_id: boardId,
      company_id: companyId || null,
      project_id: projectId || null,
      created_by_user_id: userId || null,
      is_locked: isLocked === true ? 1 : 0,
      order_num: nextOrder,
      created_at: dateToTimestamp(now),
      updated_at: dateToTimestamp(now),
      checklist: JSON.stringify([]),
    };

    await helpers.insert('tasks', task as any);

    return NextResponse.json({
      id: task.id,
      title: task.title,
      description: task.description,
      columnId: task.column_id,
      status: task.status,
      labels: JSON.parse(task.labels),
      prUrl: task.pr_url || undefined,
      assignee: task.assignee || undefined,
      assignees: JSON.parse(task.assignees),
      companyId: task.company_id || undefined,
      projectId: task.project_id || undefined,
      isLocked: !!task.is_locked,
      created_at: new Date(task.created_at * 1000).toISOString(),
      updated_at: new Date(task.updated_at * 1000).toISOString(),
      checklist: JSON.parse(task.checklist),
      order: task.order_num,
    }, { status: 201 });

  } catch (error) {
    console.error('Database error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.userId as string | undefined;
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Validate updates
    const allowedFields = ['title', 'description', 'columnId', 'status', 'labels', 'prUrl', 'assignee', 'assignees', 'order', 'isLocked'];
    const updateData: any = {};

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) {
        continue;
      }

      if (key === 'columnId') {
        if (typeof value !== 'string' || !value.trim()) {
          return NextResponse.json(
            { error: 'Column ID must be a non-empty string' },
            { status: 400 }
          );
        }
      }

      if (key === 'status') {
        const validStatuses = ['pending', 'in_progress', 'completed', 'blocked', 'approved', 'merged', 'changes_requested'];
        if (!validStatuses.includes(value as string)) {
          return NextResponse.json(
            { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
            { status: 400 }
          );
        }
      }

      if (key === 'prUrl' && value && !parsePRUrl(value as string)) {
        return NextResponse.json(
          { 
            error: 'Invalid PR URL format',
            hint: 'Expected format: https://github.com/owner/repo/pull/123',
            received: value
          },
          { status: 400 }
        );
      }

      if (key === 'order') {
        if (typeof value !== 'number' || value < 0) {
          return NextResponse.json(
            { error: 'Order must be a non-negative number' },
            { status: 400 }
          );
        }
      }

      updateData[key] = value;
    }

    updateData.updated_at = new Date();

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    // Enforce assignee permission: only assignees or admins can modify
    const existing: any = await helpers.findOne('tasks', { id });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Check if user is an assignee
    const taskAssignees = existing.assignees ? JSON.parse(existing.assignees) : (existing.assignee ? [existing.assignee] : []);
    const isAssignee = userId && taskAssignees.includes(userId);
    
    // Check if user is admin/owner
    let isAdmin = false;
    if (existing.company_id && userId) {
      try {
        const membership = await helpers.findOne('memberships', { user_id: userId, company_id: existing.company_id });
        const role = (membership as any)?.role as string | undefined;
        if (role && (role === 'owner' || role === 'admin' || role === 'staff')) {
          isAdmin = true;
        }
      } catch {}
    }
    
    // If task is locked, only assignees (or admins) can edit
    if (existing.is_locked === 1) {
      if (!isAssignee && !isAdmin) {
        return NextResponse.json({ error: 'This task is locked. Only assignees can edit it.' }, { status: 403 });
      }
    }
    
    // If task has assignees (and is not locked), only they (or admins) can edit
    if (taskAssignees.length > 0 && !isAssignee && !isAdmin) {
      return NextResponse.json({ error: 'Only assigned users can edit this task' }, { status: 403 });
    }

    // Translate updateData
    const translated: any = { updated_at: dateToTimestamp(new Date()) };
    if (updateData.title !== undefined) translated.title = updateData.title;
    if (updateData.description !== undefined) translated.description = updateData.description;
    if (updateData.columnId !== undefined) translated.column_id = updateData.columnId;
    if (updateData.status !== undefined) translated.status = updateData.status;
    if (updateData.labels !== undefined) translated.labels = JSON.stringify(updateData.labels);
    if (updateData.prUrl !== undefined) translated.pr_url = updateData.prUrl || null;
    if (updateData.assignee !== undefined) translated.assignee = updateData.assignee || null;
    if (updateData.assignees !== undefined) translated.assignees = JSON.stringify(updateData.assignees || []);
    if (updateData.order !== undefined) translated.order_num = updateData.order;
    if (updateData.isLocked !== undefined) translated.is_locked = updateData.isLocked ? 1 : 0;

    await helpers.update('tasks', { id }, translated);
    const updated: any = await helpers.findOne('tasks', { id });
    if (!updated) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      columnId: updated.column_id,
      status: updated.status,
      labels: updated.labels ? JSON.parse(updated.labels) : [],
      prUrl: updated.pr_url || undefined,
      assignee: updated.assignee,
      assignees: updated.assignees ? JSON.parse(updated.assignees) : [],
      isLocked: !!updated.is_locked,
      created_at: new Date(updated.created_at * 1000).toISOString(),
      updated_at: new Date(updated.updated_at * 1000).toISOString(),
      checklist: updated.checklist ? JSON.parse(updated.checklist) : [],
      order: updated.order_num || 0,
    });

  } catch (error) {
    console.error('Database error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Missing required parameter: id' },
      { status: 400 }
    );
  }

  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.userId as string | undefined;
    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const existing: any = await helpers.findOne('tasks', { id });
    if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    
    // Check if user is an assignee
    const taskAssignees = existing.assignees ? JSON.parse(existing.assignees) : (existing.assignee ? [existing.assignee] : []);
    const isAssignee = userId && taskAssignees.includes(userId);
    
    // Check if user is admin/owner
    let isAdmin = false;
    if (existing.company_id && userId) {
      try {
        const membership = await helpers.findOne('memberships', { user_id: userId, company_id: existing.company_id });
        const role = (membership as any)?.role as string | undefined;
        if (role && (role === 'owner' || role === 'admin' || role === 'staff')) {
          isAdmin = true;
        }
      } catch {}
    }
    
    // If task is locked, only assignees (or admins) can delete
    if (existing.is_locked === 1) {
      if (!isAssignee && !isAdmin) {
        return NextResponse.json({ error: 'This task is locked. Only assignees can delete it.' }, { status: 403 });
      }
    }
    
    // If task has assignees (and is not locked), only they (or admins) can delete
    if (taskAssignees.length > 0 && !isAssignee && !isAdmin) {
      return NextResponse.json({ error: 'Only assigned users can delete this task' }, { status: 403 });
    }

    const check = await helpers.findOne('tasks', { id });
    if (!check) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    await helpers.delete('tasks', { id });

    return NextResponse.json(
      { message: 'Task deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
