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
    const rows = await helpers.findMany<any>('shapes', { board_id: boardId }, 'created_at ASC');
    return NextResponse.json({
      shapes: rows.map((r) => ({
        id: r.id,
        boardId: r.board_id,
        type: r.type,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        fillColor: r.fill_color,
        strokeColor: r.stroke_color,
        strokeWidth: r.stroke_width,
        textContent: r.text_content || null,
        fontFamily: r.font_family || null,
        fontSize: r.font_size || null,
        fontWeight: r.font_weight || null,
        textColor: r.text_color || null,
        textAlign: r.text_align || null,
        rotation: r.rotation || 0,
        opacity: r.opacity || 1.0,
        zIndex: r.z_index || 0,
        createdAt: new Date(r.created_at * 1000).toISOString(),
        updatedAt: new Date(r.updated_at * 1000).toISOString(),
      })),
    });
  } catch (err) {
    console.error('Shapes GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch shapes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { boardId, type, x, y, width, height, fillColor, strokeColor, strokeWidth, textContent, fontSize, textColor, fontFamily, fontWeight, textAlign, rotation, opacity, zIndex } = body || {};
    if (!boardId) return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    if (!type) return NextResponse.json({ error: 'type is required' }, { status: 400 });

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const now = new Date();
    const row = {
      id: crypto.randomUUID(),
      board_id: boardId,
      type,
      x: typeof x === 'number' ? x : 100,
      y: typeof y === 'number' ? y : 100,
      width: typeof width === 'number' ? width : 150,
      height: typeof height === 'number' ? height : 100,
      fill_color: fillColor || '#60a5fa',
      stroke_color: strokeColor || '#1e293b',
      stroke_width: typeof strokeWidth === 'number' ? strokeWidth : 2,
      text_content: textContent || null,
      font_family: fontFamily || 'Inter, system-ui, sans-serif',
      font_size: typeof fontSize === 'number' ? fontSize : 16,
      font_weight: fontWeight || 'normal',
      text_color: textColor || '#ffffff',
      text_align: textAlign || 'left',
      rotation: typeof rotation === 'number' ? rotation : 0,
      opacity: typeof opacity === 'number' ? opacity : 1.0,
      z_index: typeof zIndex === 'number' ? zIndex : 0,
      created_at: dateToTimestamp(now),
      updated_at: dateToTimestamp(now),
    };

    await helpers.insert('shapes', row as any);

    return NextResponse.json({
      id: row.id,
      boardId: row.board_id,
      type: row.type,
      x: row.x,
      y: row.y,
      width: row.width,
      height: row.height,
      fillColor: row.fill_color,
      strokeColor: row.stroke_color,
      strokeWidth: row.stroke_width,
      textContent: row.text_content,
      fontFamily: row.font_family,
      fontSize: row.font_size,
      fontWeight: row.font_weight,
      textColor: row.text_color,
      textAlign: row.text_align,
      rotation: row.rotation,
      opacity: row.opacity,
      zIndex: row.z_index,
      createdAt: new Date(row.created_at * 1000).toISOString(),
      updatedAt: new Date(row.updated_at * 1000).toISOString(),
    }, { status: 201 });
  } catch (err) {
    console.error('Shapes POST error:', err);
    return NextResponse.json({ error: 'Failed to create shape' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, x, y, width, height, fillColor, strokeColor, strokeWidth, textContent, fontSize, textColor, fontFamily, fontWeight, textAlign, rotation, opacity, zIndex } = body || {};
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    console.log('[SHAPES PUT] Received update for shape:', id, 'with data:', { x, y, width, height, fillColor, strokeColor });

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const existing = await helpers.findOne<any>('shapes', { id });
    if (!existing) return NextResponse.json({ error: 'Shape not found' }, { status: 404 });

    const data: any = { updated_at: dateToTimestamp(new Date()) };
    if (typeof x === 'number') data.x = x;
    if (typeof y === 'number') data.y = y;
    if (typeof width === 'number') data.width = width;
    if (typeof height === 'number') data.height = height;
    if (typeof fillColor === 'string') data.fill_color = fillColor;
    if (typeof strokeColor === 'string') data.stroke_color = strokeColor;
    if (typeof strokeWidth === 'number') data.stroke_width = strokeWidth;
    if (textContent !== undefined) data.text_content = textContent;
    if (typeof fontSize === 'number') data.font_size = fontSize;
    if (typeof textColor === 'string') data.text_color = textColor;
    if (typeof fontFamily === 'string') data.font_family = fontFamily;
    if (typeof fontWeight === 'string') data.font_weight = fontWeight;
    if (typeof textAlign === 'string') data.text_align = textAlign;
    if (typeof rotation === 'number') data.rotation = rotation;
    if (typeof opacity === 'number') data.opacity = opacity;
    if (typeof zIndex === 'number') data.z_index = zIndex;

    console.log('[SHAPES PUT] Updating with data:', data);
    
    await helpers.update('shapes', { id }, data);

    const updated = await helpers.findOne<any>('shapes', { id });
    
    console.log('[SHAPES PUT] Updated shape from DB:', { width: updated!.width, height: updated!.height });
    
    return NextResponse.json({
      id: updated!.id,
      boardId: updated!.board_id,
      type: updated!.type,
      x: updated!.x,
      y: updated!.y,
      width: updated!.width,
      height: updated!.height,
      fillColor: updated!.fill_color,
      strokeColor: updated!.stroke_color,
      strokeWidth: updated!.stroke_width,
      textContent: updated!.text_content,
      fontFamily: updated!.font_family,
      fontSize: updated!.font_size,
      fontWeight: updated!.font_weight,
      textColor: updated!.text_color,
      textAlign: updated!.text_align,
      rotation: updated!.rotation,
      opacity: updated!.opacity,
      zIndex: updated!.z_index,
      createdAt: new Date(updated!.created_at * 1000).toISOString(),
      updatedAt: new Date(updated!.updated_at * 1000).toISOString(),
    });
  } catch (err) {
    console.error('Shapes PUT error:', err);
    console.error('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return NextResponse.json({ error: 'Failed to update shape', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const existing = await helpers.findOne<any>('shapes', { id });
    if (!existing) return NextResponse.json({ error: 'Shape not found' }, { status: 404 });

    await helpers.delete('shapes', { id });
    return NextResponse.json({ message: 'Shape deleted' });
  } catch (err) {
    console.error('Shapes DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete shape' }, { status: 500 });
  }
}
