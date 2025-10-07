import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Company } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const enterpriseId = params.id;
  const db = await connectToDatabase();
  
  const companies = await db.collection<Company>('companies').find({ enterpriseId }).toArray();
  
  return NextResponse.json({ 
    companies: companies.map(c => ({ 
      id: c.id, 
      name: c.name, 
      inviteCode: c.inviteCode 
    })) 
  });
}
