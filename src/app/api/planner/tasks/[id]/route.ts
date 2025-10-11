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
    const { ObjectId } = await import('mongodb');

    const task = await db
      .collection<Task>('tasks')
      .findOne({ _id: new ObjectId(id) });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: task._id?.toString() || task.id,
      title: task.title,
      description: task.description,
      columnId: task.columnId,
      status: task.status,
      labels: task.labels,
      prUrl: task.prUrl,
      assignee: task.assignee,
      assignees: (task as any).assignees || (task.assignee ? [task.assignee] : []),
      isLocked: (task as any).isLocked || false,
      created_at: task.created_at.toISOString(),
      updated_at: task.updated_at.toISOString(),
      checklist: task.checklist || [],
      boardId: task.boardId,
      order: task.order || 0,
      companyId: (task as any).companyId,
      projectId: (task as any).projectId,
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}