import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';

interface TaskComment {
  _id?: string;
  taskId: string;
  author: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json(
      { error: 'Missing required parameter: taskId' },
      { status: 400 }
    );
  }

  try {
    const db = getDatabase();
    const helpers = new DbHelpers(db);
    const comments = await helpers.findMany<any>('task_comments', { task_id: taskId }, 'created_at ASC');

    return NextResponse.json({
      comments: comments.map(comment => ({
        id: comment.id,
        author: comment.author,
        content: comment.content,
        created_at: new Date(comment.created_at * 1000).toISOString(),
        updated_at: new Date(comment.updated_at * 1000).toISOString(),
      })),
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, author, content } = body;

    if (!taskId || !author || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, author, content' },
        { status: 400 }
      );
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content must be a non-empty string' },
        { status: 400 }
      );
    }

    if (typeof author !== 'string' || author.trim().length === 0) {
      return NextResponse.json(
        { error: 'Author must be a non-empty string' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);
    const now = new Date();

    const comment = {
      id: crypto.randomUUID(),
      task_id: taskId,
      author: author.trim(),
      content: content.trim(),
      created_at: dateToTimestamp(now),
      updated_at: dateToTimestamp(now),
    };

    await helpers.insert('task_comments', comment as any);

    return NextResponse.json({
      id: comment.id,
      author: comment.author,
      content: comment.content,
      created_at: new Date(comment.created_at * 1000).toISOString(),
      updated_at: new Date(comment.updated_at * 1000).toISOString(),
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
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, content } = body;

    if (!id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: id, content' },
        { status: 400 }
      );
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content must be a non-empty string' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const existing = await helpers.findOne<any>('task_comments', { id });
    if (!existing) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    await helpers.update('task_comments', { id }, { content: content.trim(), updated_at: dateToTimestamp(new Date()) });
    const updated = await helpers.findOne<any>('task_comments', { id });
    return NextResponse.json({
      id: updated!.id,
      author: updated!.author,
      content: updated!.content,
      created_at: new Date(updated!.created_at * 1000).toISOString(),
      updated_at: new Date(updated!.updated_at * 1000).toISOString(),
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
      { error: 'Failed to update comment' },
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
    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const exists = await helpers.findOne('task_comments', { id });
    if (!exists) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    await helpers.delete('task_comments', { id });
    return NextResponse.json(
      { message: 'Comment deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}