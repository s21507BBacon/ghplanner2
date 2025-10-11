import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { Board } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const helpers = new DbHelpers(db);
    const projectId = request.nextUrl.searchParams.get('projectId');
    const companyId = request.nextUrl.searchParams.get('companyId');

    const query: any = {};
    if (projectId) query.projectId = projectId;
    if (companyId) query.companyId = companyId;

    const boards = await db
      .collection<Board>('boards')
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    return NextResponse.json({
      boards: boards.map(board => ({
        id: board.id || board._id?.toString(),
        name: board.name,
        description: board.description,
        companyId: (board as any).companyId,
        projectId: (board as any).projectId,
        created_at: board.created_at.toISOString(),
        updated_at: board.updated_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch boards' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, projectId, companyId } = body as any;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // projectId is optional for backward compatibility; when provided, board is scoped to project

    const db = getDatabase();
    const helpers = new DbHelpers(db);
    const now = new Date();

    const board: Board = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description?.trim() || '',
      projectId,
      companyId,
      created_at: now,
      updated_at: now,
    };

    const result = await db.collection<Board>('boards').insertOne(board);

    return NextResponse.json({
      id: board.id,
      name: board.name,
      description: board.description,
      projectId: board.projectId,
      companyId: (board as any).companyId,
      created_at: board.created_at.toISOString(),
      updated_at: board.updated_at.toISOString(),
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
      { error: 'Failed to create board' },
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

    // Check if board has columns
    const columnCount = await db
      .collection('columns')
      .countDocuments({ boardId: id });

    if (columnCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete board with columns. Delete all columns first.' },
        { status: 400 }
      );
    }

    // Check if board has tasks
    const taskCount = await db
      .collection('tasks')
      .countDocuments({ boardId: id });

    if (taskCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete board with tasks. Delete all tasks first.' },
        { status: 400 }
      );
    }

    const result = await db
      .collection<Board>('boards')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Board deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to delete board' },
      { status: 500 }
    );
  }
}
