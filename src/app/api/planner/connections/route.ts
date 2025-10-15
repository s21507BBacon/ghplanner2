import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp } from '@/lib/db';

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
    const rows = await helpers.findMany<any>('connections', { board_id: boardId }, 'created_at ASC');

    return NextResponse.json({
      connections: rows.map((r) => ({
        id: r.id,
        boardId: r.board_id,
        sourceColumnId: r.source_column_id,
        targetColumnId: r.target_column_id,
        label: r.label || undefined,
        color: r.color || undefined,
        created_at: new Date(r.created_at * 1000).toISOString(),
        updated_at: new Date(r.updated_at * 1000).toISOString(),
      })),
    });
  } catch (err) {
    console.error('Connections GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { boardId, sourceColumnId, targetColumnId, label, color } = body || {};

    if (!boardId || !sourceColumnId || !targetColumnId) {
      return NextResponse.json({ error: 'boardId, sourceColumnId, and targetColumnId are required' }, { status: 400 });
    }
    if (sourceColumnId === targetColumnId) {
      return NextResponse.json({ error: 'source and target must be different columns' }, { status: 400 });
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const now = new Date();
    const row = {
      id: crypto.randomUUID(),
      board_id: boardId,
      source_column_id: sourceColumnId,
      target_column_id: targetColumnId,
      label: label || null,
      color: color || null,
      created_at: dateToTimestamp(now),
      updated_at: dateToTimestamp(now),
    };

    await helpers.insert('connections', row as any);

    return NextResponse.json({
      id: row.id,
      boardId: row.board_id,
      sourceColumnId: row.source_column_id,
      targetColumnId: row.target_column_id,
      label: row.label || undefined,
      color: row.color || undefined,
      created_at: new Date(row.created_at * 1000).toISOString(),
      updated_at: new Date(row.updated_at * 1000).toISOString(),
    }, { status: 201 });
  } catch (err: any) {
    console.error('Connections POST error:', err);
    const message = (err && typeof err.message === 'string') ? err.message : '';
    if (message.includes('duplicate key') || message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Connection already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, label, color, sourceColumnId, targetColumnId } = body || {};
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const existing = await helpers.findOne<any>('connections', { id });
    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const data: any = { updated_at: dateToTimestamp(new Date()) };
    if (label !== undefined) data.label = label || null;
    if (color !== undefined) data.color = color || null;
    if (sourceColumnId !== undefined) data.source_column_id = sourceColumnId;
    if (targetColumnId !== undefined) data.target_column_id = targetColumnId;

    await helpers.update('connections', { id }, data);
    const updated = await helpers.findOne<any>('connections', { id });

    return NextResponse.json({
      id: updated!.id,
      boardId: updated!.board_id,
      sourceColumnId: updated!.source_column_id,
      targetColumnId: updated!.target_column_id,
      label: updated!.label || undefined,
      color: updated!.color || undefined,
      created_at: new Date(updated!.created_at * 1000).toISOString(),
      updated_at: new Date(updated!.updated_at * 1000).toISOString(),
    });
  } catch (err) {
    console.error('Connections PUT error:', err);
    return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const existing = await helpers.findOne('connections', { id });
    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    await helpers.delete('connections', { id });
    return NextResponse.json({ message: 'Connection deleted' });
  } catch (err) {
    console.error('Connections DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
  }
}
