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
    const comments = await db
      .collection<TaskComment>('task_comments')
      .find({ taskId })
      .sort({ created_at: 1 })
      .toArray();

    return NextResponse.json({
      comments: comments.map(comment => ({
        id: comment._id?.toString(),
        author: comment.author,
        content: comment.content,
        created_at: comment.created_at.toISOString(),
        updated_at: comment.updated_at.toISOString(),
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

    const comment: TaskComment = {
      taskId,
      author: author.trim(),
      content: content.trim(),
      created_at: now,
      updated_at: now,
    };

    const result = await db.collection<TaskComment>('task_comments').insertOne(comment);

    return NextResponse.json({
      id: result.insertedId.toString(),
      author: comment.author,
      content: comment.content,
      created_at: comment.created_at.toISOString(),
      updated_at: comment.updated_at.toISOString(),
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
    const { ObjectId } = await import('mongodb');

    const result = await db
      .collection<TaskComment>('task_comments')
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $set: {
            content: content.trim(),
            updated_at: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

    if (!result) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: result._id?.toString(),
      author: result.author,
      content: result.content,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
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
    const { ObjectId } = await import('mongodb');

    const result = await db
      .collection<TaskComment>('task_comments')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

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