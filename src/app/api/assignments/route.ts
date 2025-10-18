import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
  const { companyId, projectId } = body;
  
  if (!companyId || !projectId) {
    return NextResponse.json({ error: 'companyId and projectId required' }, { status: 400 });
  }
  
  // Verify company exists
  const company = await helpers.findOne<any>('companies', { id: companyId });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  
  // Verify project exists and belongs to company
  const project = await helpers.findOne<any>('projects', { id: projectId, company_id: companyId });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  
  // Check if already assigned to this specific project
  const existing = await helpers.findOne<any>('assignments', {
    user_id: userId,
    company_id: companyId,
    project_id: projectId
  });
  
  if (existing) {
    return NextResponse.json({ 
      message: 'Already assigned',
      assignmentId: existing.id 
    });
  }
  
  // Check if user is enterprise admin/owner (they can have multiple projects)
  let isEnterpriseAdmin = false;
  if (company.enterprise_id) {
    const entMembership = await helpers.findOne<any>('enterprise_memberships', {
      user_id: userId,
      enterprise_id: company.enterprise_id
    });
    isEnterpriseAdmin = entMembership && (entMembership.role === 'owner' || entMembership.role === 'admin');
  }
  
  // Regular members can only self-assign to ONE project per enterprise
  if (!isEnterpriseAdmin && company.enterprise_id) {
    // Get all companies in this enterprise
    const enterpriseCompanies = await helpers.findMany<any>('companies', { 
      enterprise_id: company.enterprise_id 
    });
    const enterpriseCompanyIds = enterpriseCompanies.map((c: any) => c.id);
    
    // Check for existing assignments in THIS enterprise only
    const allUserAssignments = await helpers.findMany<any>('assignments', { user_id: userId });
    const assignmentsInThisEnterprise = allUserAssignments.filter((a: any) => 
      enterpriseCompanyIds.includes(a.company_id)
    );
    
    if (assignmentsInThisEnterprise.length > 0) {
      return NextResponse.json({ 
        error: 'You are already assigned to a project in this enterprise. Only enterprise admins can assign you to additional projects.' 
      }, { status: 403 });
    }
  }
  
  // Create assignment
  const now = new Date();
  const assignmentId = crypto.randomUUID();
  await helpers.insert('assignments', {
    id: assignmentId,
    user_id: userId,
    company_id: companyId,
    project_id: projectId,
    assigned_at: dateToTimestamp(now),
    assigned_by_user_id: userId, // Self-assigned
  });
  
  return NextResponse.json({ 
    success: true,
    assignmentId,
    message: 'Successfully assigned to project'
  });
}
