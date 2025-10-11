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
    const columns = await db
      .collection<Column>('columns')
      .find({ boardId })
      .sort({ order: 1 })
      .toArray();

    return NextResponse.json({
      columns: columns.map(column => ({
        id: column.id || column._id?.toString(),
        name: column.name,
        color: column.color,
        order: column.order,
        boardId: column.boardId,
        created_at: column.created_at.toISOString(),
        updated_at: column.updated_at.toISOString(),
        requiresPr: !!(column as any).requiresPr,
        moveToColumnOnMerge: (column as any).moveToColumnOnMerge || undefined,
        moveToColumnOnClosed: (column as any).moveToColumnOnClosed || undefined,
        moveToColumnOnRequestChanges: (column as any).moveToColumnOnRequestChanges || undefined,
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
    const { name, color, boardId, requiresPr, moveToColumnOnMerge, moveToColumnOnClosed, moveToColumnOnRequestChanges } = body;

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
    const lastColumn = await db
      .collection<Column>('columns')
      .findOne({ boardId }, { sort: { order: -1 } });

    const nextOrder = (lastColumn?.order || 0) + 1;
    const now = new Date();

    const column: Column = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: color || 'slate',
      order: nextOrder,
      boardId,
      created_at: now,
      updated_at: now,
      requiresPr: typeof requiresPr === 'boolean' ? requiresPr : false,
      moveToColumnOnMerge: moveToColumnOnMerge || undefined,
      moveToColumnOnClosed: moveToColumnOnClosed || undefined,
      moveToColumnOnRequestChanges: moveToColumnOnRequestChanges || undefined,
    };

    const result = await db.collection<Column>('columns').insertOne(column);

    return NextResponse.json({
      id: column.id,
      name: column.name,
      color: column.color,
      order: column.order,
      boardId: column.boardId,
      created_at: column.created_at.toISOString(),
      updated_at: column.updated_at.toISOString(),
      requiresPr: column.requiresPr || false,
      moveToColumnOnMerge: column.moveToColumnOnMerge || undefined,
      moveToColumnOnClosed: column.moveToColumnOnClosed || undefined,
      moveToColumnOnRequestChanges: column.moveToColumnOnRequestChanges || undefined,
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
    const { id, name, color, order, requiresPr, moveToColumnOnMerge, moveToColumnOnClosed, moveToColumnOnRequestChanges } = body;

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
    const { ObjectId } = await import('mongodb');

    // Try to match by _id if id is a valid ObjectId, otherwise match by id field
    let query: any;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { id };
    }

    const result = await db
      .collection<Column>('columns')
      .findOneAndUpdate(
        query,
        { $set: updateData },
        { returnDocument: 'after' }
      );

    if (!result || !result.value) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      );
    }

    const updated = result.value;
    return NextResponse.json({
      id: updated._id?.toString() || updated.id,
      name: updated.name,
      color: updated.color,
      order: updated.order,
      boardId: updated.boardId,
      created_at: updated.created_at instanceof Date ? updated.created_at.toISOString() : new Date(updated.created_at).toISOString(),
      updated_at: updated.updated_at instanceof Date ? updated.updated_at.toISOString() : new Date(updated.updated_at).toISOString(),
      requiresPr: !!(updated as any).requiresPr,
      moveToColumnOnMerge: (updated as any).moveToColumnOnMerge || undefined,
      moveToColumnOnClosed: (updated as any).moveToColumnOnClosed || undefined,
      moveToColumnOnRequestChanges: (updated as any).moveToColumnOnRequestChanges || undefined,
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
    const { ObjectId } = await import('mongodb');

    // Try to match by _id if id is a valid ObjectId, otherwise match by id field
    let query: any;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { id };
    }

    // Check if column has tasks
    const taskCount = await db
      .collection('tasks')
      .countDocuments({ columnId: id });

    if (taskCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete column with tasks. Move tasks to another column first.' },
        { status: 400 }
      );
    }

    const result = await db
      .collection<Column>('columns')
      .deleteOne(query);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      );
    }

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
