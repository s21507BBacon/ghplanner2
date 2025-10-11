import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers } from '@/lib/db';
import { parsePRUrl } from '@/lib/github';

interface Comment {
  _id?: string;
  prUrl: string;
  author: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'Missing required parameter: url' },
      { status: 400 }
    );
  }

  const parsed = parsePRUrl(url);
  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid PR URL format' },
      { status: 400 }
    );
  }

  // No backing table yet in D1. Return empty list for now.
  return NextResponse.json({ comments: [] });
}

export async function POST(request: NextRequest) {
  // Not implemented in D1; acknowledge and no-op
  const body = await request.json();
  const { url, author, content } = body || {};
  if (!url || !author || !content) {
    return NextResponse.json(
      { error: 'Missing required fields: url, author, content' },
      { status: 400 }
    );
  }
  const parsed = parsePRUrl(url);
  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid PR URL format' },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, message: 'Comment storage is not enabled on this deployment.' }, { status: 202 });
}

export async function PUT(request: NextRequest) {
  // Not implemented
  const body = await request.json();
  const { id, content } = body || {};
  if (!id || !content) {
    return NextResponse.json(
      { error: 'Missing required fields: id, content' },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, message: 'Comment storage is not enabled on this deployment.' }, { status: 202 });
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

  // Not implemented
  if (!id) {
    return NextResponse.json(
      { error: 'Missing required parameter: id' },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, message: 'Comment storage is not enabled on this deployment.' }, { status: 202 });
}