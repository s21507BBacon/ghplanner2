import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const boardId = searchParams.get('boardId');
  if (!boardId) return NextResponse.json({ error: 'Missing required parameter: boardId' }, { status: 400 });

  try {
    const db = getDatabase();
    const helpers = new DbHelpers(db);
    const rows = await helpers.findMany<any>('notes', { board_id: boardId }, 'created_at ASC');
    return NextResponse.json({
      notes: rows.map((r) => ({
        id: r.id,
        boardId: r.board_id,
        x: r.x,
        y: r.y,
        color: r.color,
        content: r.content,
        style: r.style || null,
        createdAt: new Date(r.created_at * 1000).toISOString(),
        updatedAt: new Date(r.updated_at * 1000).toISOString(),
      })),
    });
  } catch (err) {
    console.error('Notes GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { boardId, x, y, color, content, style } = body || {};
    if (!boardId) return NextResponse.json({ error: 'boardId is required' }, { status: 400 });

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const now = new Date();
    const row = {
      id: crypto.randomUUID(),
      board_id: boardId,
      x: typeof x === 'number' ? x : 80,
      y: typeof y === 'number' ? y : 80,
      color: color || 'yellow',
      content: typeof content === 'string' ? content : '',
      style: (style && typeof style === 'object') ? style : null,
      created_at: dateToTimestamp(now),
      updated_at: dateToTimestamp(now),
    };

    await helpers.insert('notes', row as any);

    return NextResponse.json({
      id: row.id,
      boardId: row.board_id,
      x: row.x,
      y: row.y,
      color: row.color,
      content: row.content,
      style: row.style,
      createdAt: new Date(row.created_at * 1000).toISOString(),
      updatedAt: new Date(row.updated_at * 1000).toISOString(),
    }, { status: 201 });
  } catch (err) {
    console.error('Notes POST error:', err);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, x, y, color, content, style } = body || {};
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const existing = await helpers.findOne<any>('notes', { id });
    if (!existing) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

    const data: any = { updated_at: dateToTimestamp(new Date()) };
    if (typeof x === 'number') data.x = x;
    if (typeof y === 'number') data.y = y;
    if (typeof color === 'string') data.color = color;
    if (typeof content === 'string') data.content = content;
    if (style && typeof style === 'object') data.style = style;

    await helpers.update('notes', { id }, data);

    const updated = await helpers.findOne<any>('notes', { id });
    return NextResponse.json({
      id: updated!.id,
      boardId: updated!.board_id,
      x: updated!.x,
      y: updated!.y,
      color: updated!.color,
      content: updated!.content,
      style: updated!.style || null,
      createdAt: new Date(updated!.created_at * 1000).toISOString(),
      updatedAt: new Date(updated!.updated_at * 1000).toISOString(),
    });
  } catch (err) {
    console.error('Notes PUT error:', err);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const existing = await helpers.findOne<any>('notes', { id });
    if (!existing) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

    await helpers.delete('notes', { id });
    return NextResponse.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('Notes DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
