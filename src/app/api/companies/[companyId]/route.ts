import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const userId = s.userId as string;
  const { companyId } = params;

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  // Get company details
  const company = await helpers.findOne<any>('companies', { id: companyId });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // Check enterprise membership
  const membership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: userId,
    enterprise_id: company.enterprise_id
  });

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this enterprise' }, { status: 403 });
  }

  // Get all projects in this company
  const projects = await helpers.findMany<any>('projects', { company_id: companyId });

  // Get all assignments for this company
  const assignments = await helpers.findMany<any>('assignments', { company_id: companyId });

  // Get user details for all assigned users
  const userIds = Array.from(new Set(assignments.map((a: any) => a.user_id)));
  const users = await Promise.all(
    userIds.map(async (uid: string) => {
      const user = await helpers.findOne<any>('users', { id: uid });
      const userMembership = await helpers.findOne<any>('enterprise_memberships', {
        user_id: uid,
        enterprise_id: company.enterprise_id
      });
      return {
        id: uid,
        name: user?.name || 'Unknown',
        email: user?.email || '',
        username: user?.username || '',
        imageUrl: user?.image_url || null,
        role: userMembership?.role || 'user',
        status: userMembership?.status || 'active'
      };
    })
  );

  // Group members by project
  const projectsWithMembers = projects.map((project: any) => {
    const projectAssignments = assignments.filter((a: any) => a.project_id === project.id);
    const members = projectAssignments.map((assignment: any) => {
      const user = users.find((u: any) => u.id === assignment.user_id);
      return {
        userId: assignment.user_id,
        assignmentId: assignment.id,
        ...user
      };
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      members
    };
  });

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      description: company.description,
      enterpriseId: company.enterprise_id
    },
    projects: projectsWithMembers
  });
}
