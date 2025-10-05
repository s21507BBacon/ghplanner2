import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Board } from '@/lib/types';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const boards = await db
      .collection<Board>('boards')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      boards: boards.map(board => ({
        id: board._id?.toString() || board.id,
        name: board.name,
        description: board.description,
        createdAt: board.createdAt.toISOString(),
        updatedAt: board.updatedAt.toISOString(),
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
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const now = new Date();

    const board: Board = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection<Board>('boards').insertOne(board);

    return NextResponse.json({
      id: result.insertedId.toString(),
      name: board.name,
      description: board.description,
      createdAt: board.createdAt.toISOString(),
      updatedAt: board.updatedAt.toISOString(),
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