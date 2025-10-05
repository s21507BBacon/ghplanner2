import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Task, ChecklistItem } from '@/lib/types';
import { parsePRUrl } from '@/lib/github';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const boardId = searchParams.get('boardId');

  if (!boardId) {
    return NextResponse.json(
      { error: 'Missing required parameter: boardId' },
      { status: 400 }
    );
  }

  try {
    const db = await connectToDatabase();
    const tasks = await db
      .collection<Task>('tasks')
      .find({ boardId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      tasks: tasks.map(task => ({
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
        order: task.order || 0,
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
    const body = await request.json();
    const { title, description, columnId, status, labels, prUrl, assignee, boardId } = body;

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

    const validStatuses = ['pending', 'in_progress', 'completed', 'blocked'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Validate prUrl if provided
    if (prUrl && !parsePRUrl(prUrl)) {
      return NextResponse.json(
        { error: 'Invalid PR URL format' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();

    // Get the next order number for this column
    const lastTask = await db
      .collection<Task>('tasks')
      .findOne({ columnId }, { sort: { order: -1 } });

    const nextOrder = (lastTask?.order || 0) + 1;
    const now = new Date();

    const task: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description?.trim() || '',
      columnId,
      status: status || 'pending',
      labels: Array.isArray(labels) ? labels.filter(l => typeof l === 'string' && l.trim()) : [],
      prUrl: prUrl?.trim() || undefined,
      assignee: assignee?.trim() || undefined,
      boardId,
      order: nextOrder,
      createdAt: now,
      updatedAt: now,
      checklist: [],
    };

    const result = await db.collection<Task>('tasks').insertOne(task);

    return NextResponse.json({
      id: result.insertedId.toString(),
      title: task.title,
      description: task.description,
      columnId: task.columnId,
      status: task.status,
      labels: task.labels,
      prUrl: task.prUrl,
      assignee: task.assignee,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      checklist: task.checklist,
      order: task.order,
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
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Validate updates
    const allowedFields = ['title', 'description', 'columnId', 'status', 'labels', 'prUrl', 'assignee', 'order'];
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
        const validStatuses = ['pending', 'in_progress', 'completed', 'blocked'];
        if (!validStatuses.includes(value as string)) {
          return NextResponse.json(
            { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
            { status: 400 }
          );
        }
      }

      if (key === 'prUrl' && value && !parsePRUrl(value as string)) {
        return NextResponse.json(
          { error: 'Invalid PR URL format' },
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

    updateData.updatedAt = new Date();

    const db = await connectToDatabase();
    const { ObjectId } = require('mongodb');

    const result = await db
      .collection<Task>('tasks')
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

    if (!result || !result.value) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const updated = result.value;
    return NextResponse.json({
      id: updated._id?.toString() || updated.id,
      title: updated.title,
      description: updated.description,
      columnId: updated.columnId,
      status: updated.status,
      labels: updated.labels,
      prUrl: updated.prUrl,
      assignee: updated.assignee,
      createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : new Date(updated.createdAt).toISOString(),
      updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : new Date(updated.updatedAt).toISOString(),
      checklist: updated.checklist || [],
      order: updated.order || 0,
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
    const db = await connectToDatabase();
    const { ObjectId } = require('mongodb');

    const result = await db
      .collection<Task>('tasks')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

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
