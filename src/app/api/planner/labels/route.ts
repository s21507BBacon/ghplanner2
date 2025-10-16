import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET /api/planner/labels - Get all labels for a board
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    const labels = await sql`
      SELECT id, name, color, board_id as "boardId", project_id as "projectId", 
             company_id as "companyId", created_at as "createdAt", updated_at as "updatedAt"
      FROM labels
      WHERE board_id = ${boardId}
      ORDER BY name ASC
    `;

    return NextResponse.json({ labels });
  } catch (error) {
    console.error('Error fetching labels:', error);
    return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 });
  }
}

// POST /api/planner/labels - Create a new label
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, color, boardId, projectId, companyId } = await request.json();

    if (!name || !color || !boardId) {
      return NextResponse.json({ error: 'Name, color, and board ID are required' }, { status: 400 });
    }

    const id = `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const [label] = await sql`
      INSERT INTO labels (id, name, color, board_id, project_id, company_id, created_at, updated_at)
      VALUES (${id}, ${name}, ${color}, ${boardId}, ${projectId || null}, ${companyId || null}, ${now}, ${now})
      RETURNING id, name, color, board_id as "boardId", project_id as "projectId", 
                company_id as "companyId", created_at as "createdAt", updated_at as "updatedAt"
    `;

    return NextResponse.json({ label }, { status: 201 });
  } catch (error) {
    console.error('Error creating label:', error);
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 });
  }
}

// PUT /api/planner/labels - Update a label
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, color } = await request.json();

    if (!id || !name || !color) {
      return NextResponse.json({ error: 'ID, name, and color are required' }, { status: 400 });
    }

    const now = Date.now();

    const [label] = await sql`
      UPDATE labels
      SET name = ${name}, color = ${color}, updated_at = ${now}
      WHERE id = ${id}
      RETURNING id, name, color, board_id as "boardId", project_id as "projectId", 
                company_id as "companyId", created_at as "createdAt", updated_at as "updatedAt"
    `;

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    return NextResponse.json({ label });
  } catch (error) {
    console.error('Error updating label:', error);
    return NextResponse.json({ error: 'Failed to update label' }, { status: 500 });
  }
}

// DELETE /api/planner/labels - Delete a label
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Label ID is required' }, { status: 400 });
    }

    // Delete the label (task_labels will be deleted via CASCADE)
    await sql`DELETE FROM labels WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting label:', error);
    return NextResponse.json({ error: 'Failed to delete label' }, { status: 500 });
  }
}
