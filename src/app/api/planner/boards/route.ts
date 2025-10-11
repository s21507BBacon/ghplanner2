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
    if (projectId) query.project_id = projectId;
    if (companyId) query.company_id = companyId;

    const boards = await helpers.findMany<any>(
      'boards',
      Object.keys(query).length ? query : undefined,
      'created_at DESC'
    );

    return NextResponse.json({
      boards: boards.map(board => ({
        id: board.id,
        name: board.name,
        description: board.description,
        companyId: (board as any).company_id || undefined,
        projectId: (board as any).project_id || undefined,
        created_at: new Date((board as any).created_at * 1000).toISOString(),
        updated_at: new Date((board as any).updated_at * 1000).toISOString(),
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

    const board = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description?.trim() || '',
      project_id: projectId || null,
      company_id: companyId || null,
      created_at: dateToTimestamp(now),
      updated_at: dateToTimestamp(now),
    } as const;

    await helpers.insert('boards', board as any);

    return NextResponse.json({
      id: board.id,
      name: board.name,
      description: board.description,
      projectId: (board as any).project_id || undefined,
      companyId: (board as any).company_id || undefined,
      created_at: new Date((board as any).created_at * 1000).toISOString(),
      updated_at: new Date((board as any).updated_at * 1000).toISOString(),
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

    // Check if board has columns
    const columnCount = (await helpers.findMany('columns', { board_id: id })).length;

    if (columnCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete board with columns. Delete all columns first.' },
        { status: 400 }
      );
    }

    // Check if board has tasks
    const taskCount = (await helpers.findMany('tasks', { board_id: id })).length;

    if (taskCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete board with tasks. Delete all tasks first.' },
        { status: 400 }
      );
    }

    const exists = await helpers.findOne('boards', { id });
    if (!exists) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      );
    }

    await helpers.delete('boards', { id });

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
