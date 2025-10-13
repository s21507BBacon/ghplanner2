import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/crypto';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const enterpriseId = params.id;

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  // Check if user is owner/admin of the enterprise
  const membership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: userId,
    enterprise_id: enterpriseId,
    status: 'active'
  });

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get the enterprise with GitHub token
  const enterprise = await helpers.findOne<any>('enterprises', { id: enterpriseId });
  if (!enterprise) {
    return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
  }

  return NextResponse.json({
    hasToken: !!enterprise.github_token_encrypted
  });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const enterpriseId = params.id;

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  // Check if user is owner/admin of the enterprise
  const membership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: userId,
    enterprise_id: enterpriseId,
    status: 'active'
  });

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get the enterprise
  const enterprise = await helpers.findOne<any>('enterprises', { id: enterpriseId });
  if (!enterprise) {
    return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
  }

  const body = await request.json();
  const { githubToken } = body;

  if (!githubToken || typeof githubToken !== 'string') {
    return NextResponse.json({ error: 'GitHub token is required' }, { status: 400 });
  }

  // Basic validation - GitHub tokens are typically 40 characters (classic) or start with ghp_/gho_/ghu_/ghs_/ghr_
  if (githubToken.length < 35) {
    return NextResponse.json({ error: 'Invalid GitHub token format' }, { status: 400 });
  }

  try {
    // Encrypt the token
    const encryptedToken = encrypt(githubToken);

    // Update the enterprise
    await helpers.update(
      'enterprises',
      { id: enterpriseId },
      {
        github_token_encrypted: encryptedToken,
        updated_at: dateToTimestamp(new Date())
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving GitHub token:', error);
    return NextResponse.json({ error: 'Failed to save GitHub token' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const enterpriseId = params.id;

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  // Check if user is owner/admin of the enterprise
  const membership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: userId,
    enterprise_id: enterpriseId,
    status: 'active'
  });

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get the enterprise
  const enterprise = await helpers.findOne<any>('enterprises', { id: enterpriseId });
  if (!enterprise) {
    return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
  }

  try {
    // Remove the GitHub token
    await helpers.update(
      'enterprises',
      { id: enterpriseId },
      {
        github_token_encrypted: null,
        updated_at: dateToTimestamp(new Date())
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing GitHub token:', error);
    return NextResponse.json({ error: 'Failed to remove GitHub token' }, { status: 500 });
  }
}
