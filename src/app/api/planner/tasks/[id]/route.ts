import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
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
    const db = await connectToDatabase();
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
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      checklist: task.checklist || [],
      boardId: task.boardId,
      order: task.order || 0,
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}