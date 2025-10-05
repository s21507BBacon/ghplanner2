import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
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
    const db = await connectToDatabase();
    const columns = await db
      .collection<Column>('columns')
      .find({ boardId })
      .sort({ order: 1 })
      .toArray();

    return NextResponse.json({
      columns: columns.map(column => ({
        id: column._id?.toString() || column.id,
        name: column.name,
        color: column.color,
        order: column.order,
        boardId: column.boardId,
        createdAt: column.createdAt.toISOString(),
        updatedAt: column.updatedAt.toISOString(),
        requiresPr: !!(column as any).requiresPr,
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
    const { name, color, boardId, requiresPr } = body;

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

    const db = await connectToDatabase();

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
      createdAt: now,
      updatedAt: now,
      requiresPr: typeof requiresPr === 'boolean' ? requiresPr : false,
    };

    const result = await db.collection<Column>('columns').insertOne(column);

    return NextResponse.json({
      id: result.insertedId.toString(),
      name: column.name,
      color: column.color,
      order: column.order,
      boardId: column.boardId,
      createdAt: column.createdAt.toISOString(),
      updatedAt: column.updatedAt.toISOString(),
      requiresPr: column.requiresPr || false,
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
    const { id, name, color, order, requiresPr } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Column ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = { updatedAt: new Date() };

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

    const db = await connectToDatabase();
    const { ObjectId } = await import('mongodb');

    const result = await db
      .collection<Column>('columns')
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
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
      createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : new Date(updated.createdAt).toISOString(),
      updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : new Date(updated.updatedAt).toISOString(),
      requiresPr: !!(updated as any).requiresPr,
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
    const db = await connectToDatabase();
    const { ObjectId } = await import('mongodb');

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
      .deleteOne({ _id: new ObjectId(id) });

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
