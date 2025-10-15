import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { Column, COLUMN_COLORS } from '@/lib/types';

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
    const db = getDatabase();
    const helpers = new DbHelpers(db);
    const columns = await helpers.findMany<any>('columns', { board_id: boardId }, 'order_num ASC');

    return NextResponse.json({
      columns: columns.map(column => ({
        id: column.id,
        name: column.name,
        color: column.color,
        order: column.order_num,
        boardId: column.board_id,
        x: typeof column.x === 'number' ? column.x : 0,
        y: typeof column.y === 'number' ? column.y : 0,
        width: typeof column.width === 'number' ? column.width : undefined,
        height: typeof column.height === 'number' ? column.height : undefined,
        created_at: new Date(column.created_at * 1000).toISOString(),
        updated_at: new Date(column.updated_at * 1000).toISOString(),
        requiresPr: !!column.requires_pr,
        moveToColumnOnMerge: column.move_to_column_on_merge || undefined,
        moveToColumnOnClosed: column.move_to_column_on_closed || undefined,
        moveToColumnOnRequestChanges: column.move_to_column_on_request_changes || undefined,
      })),
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch columns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, boardId, requiresPr, moveToColumnOnMerge, moveToColumnOnClosed, moveToColumnOnRequestChanges, x, y, width, height } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!boardId || typeof boardId !== 'string') {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      );
    }

    // Validate color
    const validColors = COLUMN_COLORS.map(c => c.value);
    if (color && !validColors.includes(color)) {
      return NextResponse.json(
        { error: 'Invalid color. Must be one of: ' + validColors.join(', ') },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    // Get the next order number
    const existing = await helpers.findMany<any>('columns', { board_id: boardId }, 'order_num DESC');
    const nextOrder = (existing[0]?.order_num || 0) + 1;
    const now = new Date();

    const column = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: color || 'slate',
      order_num: nextOrder,
      board_id: boardId,
      x: typeof x === 'number' ? Math.round(x) : nextOrder * 320,
      y: typeof y === 'number' ? Math.round(y) : 0,
      width: typeof width === 'number' ? Math.round(width) : null,
      height: typeof height === 'number' ? Math.round(height) : null,
      created_at: dateToTimestamp(now),
      updated_at: dateToTimestamp(now),
      requires_pr: typeof requiresPr === 'boolean' ? requiresPr : 0,
      move_to_column_on_merge: moveToColumnOnMerge || null,
      move_to_column_on_closed: moveToColumnOnClosed || null,
      move_to_column_on_request_changes: moveToColumnOnRequestChanges || null,
    };

    await helpers.insert('columns', column as any);

    return NextResponse.json({
      id: column.id,
      name: column.name,
      color: column.color,
      order: column.order_num,
      boardId: column.board_id,
      x: column.x || 0,
      y: column.y || 0,
      width: column.width || undefined,
      height: column.height || undefined,
      created_at: new Date((column as any).created_at * 1000).toISOString(),
      updated_at: new Date((column as any).updated_at * 1000).toISOString(),
      requiresPr: !!column.requires_pr,
      moveToColumnOnMerge: column.move_to_column_on_merge || undefined,
      moveToColumnOnClosed: column.move_to_column_on_closed || undefined,
      moveToColumnOnRequestChanges: column.move_to_column_on_request_changes || undefined,
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
      { error: 'Failed to create column' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, color, order, requiresPr, moveToColumnOnMerge, moveToColumnOnClosed, moveToColumnOnRequestChanges, x, y, width, height } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Column ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = { updated_at: new Date() };

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Name must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (color !== undefined) {
      const validColors = COLUMN_COLORS.map(c => c.value);
      if (!validColors.includes(color)) {
        return NextResponse.json(
          { error: 'Invalid color. Must be one of: ' + validColors.join(', ') },
          { status: 400 }
        );
      }
      updateData.color = color;
    }

    if (order !== undefined) {
      if (typeof order !== 'number' || order < 0) {
        return NextResponse.json(
          { error: 'Order must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.order = order;
    }

    if (requiresPr !== undefined) {
      if (typeof requiresPr !== 'boolean') {
        return NextResponse.json(
          { error: 'requiresPr must be a boolean' },
          { status: 400 }
        );
      }
      (updateData as any).requiresPr = requiresPr;
    }

    if (x !== undefined) {
      if (typeof x !== 'number' || !Number.isFinite(x)) {
        return NextResponse.json(
          { error: 'x must be a number' },
          { status: 400 }
        );
      }
      (updateData as any).x = Math.round(x);
    }

    if (y !== undefined) {
      if (typeof y !== 'number' || !Number.isFinite(y)) {
        return NextResponse.json(
          { error: 'y must be a number' },
          { status: 400 }
        );
      }
      (updateData as any).y = Math.round(y);
    }

    if (width !== undefined) {
      if (typeof width !== 'number' || !Number.isFinite(width)) {
        return NextResponse.json(
          { error: 'width must be a number' },
          { status: 400 }
        );
      }
      (updateData as any).width = Math.round(width);
    }

    if (height !== undefined) {
      if (typeof height !== 'number' || !Number.isFinite(height)) {
        return NextResponse.json(
          { error: 'height must be a number' },
          { status: 400 }
        );
      }
      (updateData as any).height = Math.round(height);
    }

    if (moveToColumnOnMerge !== undefined) {
      if (moveToColumnOnMerge !== null && typeof moveToColumnOnMerge !== 'string') {
        return NextResponse.json(
          { error: 'moveToColumnOnMerge must be a string or null' },
          { status: 400 }
        );
      }
      (updateData as any).moveToColumnOnMerge = moveToColumnOnMerge || null;
    }

    if (moveToColumnOnClosed !== undefined) {
      if (moveToColumnOnClosed !== null && typeof moveToColumnOnClosed !== 'string') {
        return NextResponse.json(
          { error: 'moveToColumnOnClosed must be a string or null' },
          { status: 400 }
        );
      }
      (updateData as any).moveToColumnOnClosed = moveToColumnOnClosed || null;
    }

    if (moveToColumnOnRequestChanges !== undefined) {
      if (moveToColumnOnRequestChanges !== null && typeof moveToColumnOnRequestChanges !== 'string') {
        return NextResponse.json(
          { error: 'moveToColumnOnRequestChanges must be a string or null' },
          { status: 400 }
        );
      }
      (updateData as any).moveToColumnOnRequestChanges = moveToColumnOnRequestChanges || null;
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const existing = await helpers.findOne<any>('columns', { id });
    if (!existing) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      );
    }

    // Translate fields
    const translated: any = { updated_at: dateToTimestamp(new Date()) };
    if (updateData.name !== undefined) translated.name = updateData.name;
    if (updateData.color !== undefined) translated.color = updateData.color;
    if (updateData.order !== undefined) translated.order_num = updateData.order;
    if ((updateData as any).requiresPr !== undefined) translated.requires_pr = (updateData as any).requiresPr ? 1 : 0;
    if ((updateData as any).x !== undefined) translated.x = (updateData as any).x;
    if ((updateData as any).y !== undefined) translated.y = (updateData as any).y;
    if ((updateData as any).width !== undefined) translated.width = (updateData as any).width;
    if ((updateData as any).height !== undefined) translated.height = (updateData as any).height;
    if ((updateData as any).moveToColumnOnMerge !== undefined) translated.move_to_column_on_merge = (updateData as any).moveToColumnOnMerge || null;
    if ((updateData as any).moveToColumnOnClosed !== undefined) translated.move_to_column_on_closed = (updateData as any).moveToColumnOnClosed || null;
    if ((updateData as any).moveToColumnOnRequestChanges !== undefined) translated.move_to_column_on_request_changes = (updateData as any).moveToColumnOnRequestChanges || null;

    await helpers.update('columns', { id }, translated);
    const updated = await helpers.findOne<any>('columns', { id });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      color: updated.color,
      order: updated.order_num,
      boardId: updated.board_id,
      x: typeof updated.x === 'number' ? updated.x : 0,
      y: typeof updated.y === 'number' ? updated.y : 0,
      width: typeof updated.width === 'number' ? updated.width : undefined,
      height: typeof updated.height === 'number' ? updated.height : undefined,
      created_at: new Date(updated.created_at * 1000).toISOString(),
      updated_at: new Date(updated.updated_at * 1000).toISOString(),
      requiresPr: !!updated.requires_pr,
      moveToColumnOnMerge: updated.move_to_column_on_merge || undefined,
      moveToColumnOnClosed: updated.move_to_column_on_closed || undefined,
      moveToColumnOnRequestChanges: updated.move_to_column_on_request_changes || undefined,
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
      { error: 'Failed to update column' },
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

    // Check if column has tasks
    const taskCount = (await helpers.findMany('tasks', { column_id: id })).length;

    if (taskCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete column with tasks. Move tasks to another column first.' },
        { status: 400 }
      );
    }

    const existing2 = await helpers.findOne('columns', { id });
    if (!existing2) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      );
    }
    await helpers.delete('columns', { id });

    return NextResponse.json(
      { message: 'Column deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to delete column' },
      { status: 500 }
    );
  }
}
