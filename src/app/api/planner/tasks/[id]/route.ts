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

    const safeJsonParse = (value: any, fallback: any = []) => {
      // If already an object/array (PostgreSQL JSONB), return as-is
      if (value && typeof value === 'object') return value;
      // If null/undefined/empty string, return fallback
      if (!value || (typeof value === 'string' && value.trim() === '')) return fallback;
      // If string, try to parse
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          console.warn('Failed to parse JSON:', value, e);
          return fallback;
        }
      }
      return fallback;
    };

    return NextResponse.json({
      id: task.id,
      title: task.title,
      description: task.description,
      columnId: task.column_id,
      status: task.status,
      labels: safeJsonParse(task.labels, []),
      prUrl: task.pr_url || undefined,
      assignee: task.assignee || undefined,
      assignees: safeJsonParse(task.assignees, task.assignee ? [task.assignee] : []),
      isLocked: !!task.is_locked,
      createdAt: new Date(task.created_at * 1000).toISOString(),
      updatedAt: new Date(task.updated_at * 1000).toISOString(),
      checklist: safeJsonParse(task.checklist, []),
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