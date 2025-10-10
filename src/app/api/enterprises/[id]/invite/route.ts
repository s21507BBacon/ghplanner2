import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEnterpriseInviteEmail } from '@/lib/email';
import type { Enterprise, EnterpriseInvite, AppUser } from '@/lib/types';

interface ParsedInvitee {
  email: string;
  name?: string;
}

function parseCSV(csvContent: string): ParsedInvitee[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must contain header row and at least one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const emailIndex = headers.findIndex(h => 
    h === 'email' || h === 'email address' || h === 'e-mail'
  );
  
  if (emailIndex === -1) {
    throw new Error('CSV must contain an "email" column');
  }

  const nameIndex = headers.findIndex(h => 
    h === 'name' || h === 'first name' || h === 'firstname' || h === 'full name'
  );

  const invitees: ParsedInvitee[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    
    const email = values[emailIndex];
    if (!email || !email.includes('@')) {
      console.warn(`Skipping invalid email on line ${i + 1}: ${email}`);
      continue;
    }

    const name = nameIndex !== -1 ? values[nameIndex] : undefined;
    
    invitees.push({ email, name });
  }

  return invitees;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const userId = s.userId as string;
  const enterpriseId = params.id;

  const db = await connectToDatabase();

  const enterprise = await db.collection<Enterprise>('enterprises').findOne({ 
    id: enterpriseId 
  } as any);

  if (!enterprise) {
    return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
  }

  if (enterprise.ownerUserId !== userId) {
    return NextResponse.json({ 
      error: 'Only the enterprise owner can send invites' 
    }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('csv') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'CSV file required' }, { status: 400 });
  }

  const csvContent = await file.text();
  
  let invitees: ParsedInvitee[];
  try {
    invitees = parseCSV(csvContent);
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Failed to parse CSV' 
    }, { status: 400 });
  }

  if (invitees.length === 0) {
    return NextResponse.json({ 
      error: 'No valid invitees found in CSV' 
    }, { status: 400 });
  }

  const inviter = await db.collection<AppUser>('users').findOne({ 
    id: userId 
  } as any);
  const inviterName = inviter?.name || inviter?.email || 'Someone';

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const invitee of invitees) {
    try {
      const existingInvite = await db.collection<EnterpriseInvite>('enterpriseInvites').findOne({
        enterpriseId,
        email: invitee.email,
        status: 'pending'
      } as any);

      let token: string;
      if (existingInvite) {
        token = existingInvite.token;
        await db.collection<EnterpriseInvite>('enterpriseInvites').updateOne(
          { id: existingInvite.id } as any,
          { 
            $set: { 
              expiresAt,
              invitedByUserId: userId,
              name: invitee.name || existingInvite.name
            } 
          }
        );
      } else {
        token = crypto.randomUUID();
        const invite: EnterpriseInvite = {
          id: crypto.randomUUID(),
          enterpriseId,
          email: invitee.email,
          name: invitee.name,
          token,
          invitedByUserId: userId,
          status: 'pending',
          expiresAt,
          createdAt: now,
        };
        await db.collection<EnterpriseInvite>('enterpriseInvites').insertOne(invite as any);
      }

      await sendEnterpriseInviteEmail(
        invitee.email,
        token,
        enterprise.name,
        inviterName,
        invitee.name
      );

      results.sent++;
    } catch (error: any) {
      console.error(`Failed to send invite to ${invitee.email}:`, error);
      results.failed++;
      results.errors.push(`${invitee.email}: ${error.message}`);
    }
  }

  return NextResponse.json({ 
    success: true,
    sent: results.sent,
    failed: results.failed,
    errors: results.errors.length > 0 ? results.errors : undefined
  });
}

