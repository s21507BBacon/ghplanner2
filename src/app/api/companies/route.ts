import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Company, Membership } from '@/lib/types';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function randomCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function GET() {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const db = await connectToDatabase();
  
  // Get companies from memberships
  const memberships = await db.collection<Membership>('memberships').find({ userId, status: 'active' }).toArray();
  const companyIds = memberships.map(m => m.companyId);
  
  // Get companies from owned enterprises
  const ownedEnterprises = await db.collection('enterprises').find({ ownerUserId: userId } as any).toArray();
  const ownedEnterpriseIds = ownedEnterprises.map((e: any) => e.id);
  const enterpriseCompanies = await db.collection<Company>('companies').find({ enterpriseId: { $in: ownedEnterpriseIds } } as any).toArray();
  const enterpriseCompanyIds = enterpriseCompanies.map(c => c.id);
  
  // Combine both lists
  const allCompanyIds = [...new Set([...companyIds, ...enterpriseCompanyIds])];
  const companies = await db.collection<Company>('companies').find({ id: { $in: allCompanyIds } } as any).toArray();
  
  return NextResponse.json({ companies: companies.map(c => ({ id: c.id, name: c.name, inviteCode: c.inviteCode, enterpriseId: c.enterpriseId })) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const db = await connectToDatabase();
  const body = await request.json();
  const { name, enterpriseId } = body;
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }
  const now = new Date();
  const company: Company = {
    id: crypto.randomUUID(),
    name: name.trim(),
    slug: slugify(name),
    ownerUserId: userId,
    enterpriseId: enterpriseId || undefined,
    inviteCode: randomCode(8),
    inviteLinkSalt: crypto.randomUUID(),
    domainAllowlist: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<Company>('companies').insertOne(company as any);
  const membership: Membership = {
    id: crypto.randomUUID(),
    userId,
    companyId: company.id,
    role: 'owner',
    status: 'active',
    createdAt: now,
  };
  await db.collection<Membership>('memberships').insertOne(membership as any);
  return NextResponse.json({ id: company.id, name: company.name, inviteCode: company.inviteCode, enterpriseId: company.enterpriseId });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const db = await connectToDatabase();
  const body = await request.json();
  const { id, name } = body;
  
  if (!id || !name || typeof name !== 'string') {
    return NextResponse.json({ error: 'id and name required' }, { status: 400 });
  }
  
  const member = await db.collection<Membership>('memberships').findOne({ userId, companyId: id } as any);
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const now = new Date();
  const result = await db.collection<Company>('companies').findOneAndUpdate(
    { id } as any,
    { $set: { name: name.trim(), slug: slugify(name), updatedAt: now } },
    { returnDocument: 'after' }
  );
  
  if (!result || !(result as any).value) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  
  const company = (result as any).value as Company;
  return NextResponse.json({ id: company.id, name: company.name, inviteCode: company.inviteCode, enterpriseId: company.enterpriseId });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const id = request.nextUrl.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  
  const db = await connectToDatabase();
  const member = await db.collection<Membership>('memberships').findOne({ userId, companyId: id } as any);
  if (!member || member.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden - Only owners can delete companies' }, { status: 403 });
  }
  
  const result = await db.collection<Company>('companies').deleteOne({ id } as any);
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  
  return NextResponse.json({ ok: true });
}
