import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
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
  const db = getDatabase();
  const helpers = new DbHelpers(db);
  
  // Get companies from memberships
  const memberships: any[] = await helpers.findMany('memberships', { user_id: userId, status: 'active' });
  const companyIds = memberships.map(m => m.company_id);
  
  // Get companies from owned enterprises
  const ownedEnterprises = await helpers.findMany('enterprises', { owner_user_id: userId });
  const ownedEnterpriseIds = ownedEnterprises.map((e: any) => e.id);
  const enterpriseCompanies = ownedEnterpriseIds.length > 0 
    ? await helpers.findWhereIn<any>('companies', 'enterprise_id', ownedEnterpriseIds)
    : [];
  const enterpriseCompanyIds = enterpriseCompanies.map((c: any) => c.id);
  
  // Combine both lists
  const allCompanyIds = [...new Set([...companyIds, ...enterpriseCompanyIds])];
  const companies = allCompanyIds.length > 0
    ? await helpers.findWhereIn<any>('companies', 'id', allCompanyIds)
    : [];
  
  return NextResponse.json({ 
    companies: companies.map((c: any) => ({ 
      id: c.id, 
      name: c.name, 
      inviteCode: c.invite_code, 
      enterpriseId: c.enterprise_id || undefined
    })) 
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const db = getDatabase();
  const helpers = new DbHelpers(db);
  const body = await request.json();
  const { name, enterpriseId } = body;
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }
  const now = new Date();
  const nowTs = dateToTimestamp(now);
  const company = {
    id: crypto.randomUUID(),
    name: name.trim(),
    slug: slugify(name),
    owner_user_id: userId,
    enterprise_id: enterpriseId || null,
    invite_code: randomCode(8),
    invite_link_salt: crypto.randomUUID(),
    domain_allowlist: JSON.stringify([]),
    created_at: nowTs,
    updated_at: nowTs,
  };
  await helpers.insert('companies', company);
  const membership = {
    id: crypto.randomUUID(),
    user_id: userId,
    company_id: company.id,
    role: 'owner',
    status: 'active',
    created_at: nowTs,
  };
  await helpers.insert('memberships', membership);
  return NextResponse.json({ 
    id: company.id, 
    name: company.name, 
    inviteCode: company.invite_code, 
    enterpriseId: company.enterprise_id || undefined
  });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const db = getDatabase();
  const helpers = new DbHelpers(db);
  const body = await request.json();
  const { id, name } = body;
  
  if (!id || !name || typeof name !== 'string') {
    return NextResponse.json({ error: 'id and name required' }, { status: 400 });
  }
  
  const member: any = await helpers.findOne('memberships', { user_id: userId, company_id: id });
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const now = new Date();
  const nowTs = dateToTimestamp(now);
  await helpers.update('companies', { id }, {
    name: name.trim(),
    slug: slugify(name),
    updated_at: nowTs
  });
  
  const company: any = await helpers.findOne('companies', { id });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  
  return NextResponse.json({ 
    id: company.id, 
    name: company.name, 
    inviteCode: company.invite_code, 
    enterpriseId: company.enterprise_id || undefined,
    allocationMode: company.allocation_mode || 'auto'
  });
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
  
  const db = getDatabase();
  const helpers = new DbHelpers(db);
  const member: any = await helpers.findOne('memberships', { user_id: userId, company_id: id });
  if (!member || member.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden - Only owners can delete companies' }, { status: 403 });
  }
  
  const exists = await helpers.findOne('companies', { id });
  if (!exists) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  
  await helpers.delete('companies', { id });
  return NextResponse.json({ ok: true });
}
