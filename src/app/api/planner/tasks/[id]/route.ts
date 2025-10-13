import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { Task } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: 'Task ID is required' },
      { status: 400 }
    );
  }

  try {
    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const task: any = await helpers.findOne('tasks', { id });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get enterprise ID from company if available
    let enterpriseId: string | undefined;
    if (task.company_id) {
      const company: any = await helpers.findOne('companies', { id: task.company_id });
      enterpriseId = company?.enterprise_id;
    }

    return NextResponse.json({
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
      boardId: task.board_id,
      order: task.order_num || 0,
      companyId: task.company_id || undefined,
      projectId: task.project_id || undefined,
      enterpriseId,
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}