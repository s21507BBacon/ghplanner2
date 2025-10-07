import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Assignment, Project } from '@/lib/types';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const companyId = request.nextUrl.searchParams.get('companyId');
  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 });
  }

  const db = await connectToDatabase();
  const projects = await db.collection<Project>('projects').find({ companyId } as any).toArray();
  
  const projectsWithCapacity = await Promise.all(
    projects.map(async (project) => {
      const assignments = await db.collection<Assignment>('assignments')
        .find({ projectId: project.id } as any)
        .toArray();
      
      return {
        id: project.id,
        name: project.name,
        maxSeats: project.maxSeats,
        currentSeats: assignments.length,
        isFull: assignments.length >= project.maxSeats,
        isActive: project.isActive,
        inviteCode: project.inviteCode || '',
      };
    })
  );

  return NextResponse.json({ projects: projectsWithCapacity });
}

