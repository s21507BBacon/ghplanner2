import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendRoleAssignmentEmail } from '@/lib/email';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const currentUserId = s.userId as string;
  const enterpriseId = params.id;
  const targetUserId = params.userId;

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  // Check if current user is owner/admin
  const currentUserMembership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: currentUserId,
    enterprise_id: enterpriseId,
    status: 'active'
  });

  if (!currentUserMembership || (currentUserMembership.role !== 'owner' && currentUserMembership.role !== 'admin' && currentUserMembership.role !== 'company_admin')) {
    return NextResponse.json({ error: 'Not authorised to manage member roles' }, { status: 403 });
  }

  // Get the enterprise to check ownership
  const enterprise = await helpers.findOne<any>('enterprises', { id: enterpriseId });
  if (!enterprise) {
    return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
  }

  const body = await request.json();
  const { role } = body;

  if (!role) {
    return NextResponse.json({ error: 'Role is required' }, { status: 400 });
  }

  // Validate role
  const validRoles = ['owner', 'admin', 'company_admin', 'project_admin', 'project_lead', 'code_reviewer', 'user', 'member', 'staff'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Only the enterprise owner or existing owners can assign 'owner' role to others
  if (role === 'owner' && enterprise.owner_user_id !== currentUserId && currentUserMembership.role !== 'owner') {
    return NextResponse.json({ error: 'Only the enterprise owner or users with owner role can assign owner role' }, { status: 403 });
  }

  // Prevent changing the original enterprise owner's role
  if (enterprise.owner_user_id === targetUserId && role !== 'owner') {
    return NextResponse.json({ error: 'Cannot change the enterprise owner\'s role' }, { status: 403 });
  }

  // Get target user's membership
  const targetMembership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: targetUserId,
    enterprise_id: enterpriseId
  });

  if (!targetMembership) {
    return NextResponse.json({ error: 'User is not a member of this enterprise' }, { status: 404 });
  }

  const oldRole = targetMembership.role;
  const now = new Date();

  // Get target user details
  const targetUser = await helpers.findOne<any>('users', { id: targetUserId });
  if (!targetUser) {
    return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
  }

  // Get current user details (who is making the change)
  const currentUser = await helpers.findOne<any>('users', { id: currentUserId });
  const assignedByName = currentUser?.name || currentUser?.email || 'Administrator';

  try {
    // Update the role in enterprise_memberships
    await helpers.update(
      'enterprise_memberships',
      { id: targetMembership.id },
      {
        role: role,
        updated_at: dateToTimestamp(now)
      }
    );

    // Create audit log entry
    await helpers.insert('role_change_audit', {
      id: crypto.randomUUID(),
      user_id: targetUserId,
      changed_by: currentUserId,
      entity_type: 'enterprise',
      entity_id: enterpriseId,
      old_role: oldRole,
      new_role: role,
      created_at: dateToTimestamp(now)
    });

    // Send email notification to the user
    try {
      await sendRoleAssignmentEmail(
        targetUser.email,
        targetUser.name || targetUser.email,
        enterprise.name,
        role,
        oldRole,
        assignedByName
      );
      console.log(`Role assignment email sent to ${targetUser.email}`);
    } catch (emailError) {
      // Log the error but don't fail the request if email fails
      console.error('Failed to send role assignment email:', emailError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Role updated successfully',
      oldRole,
      newRole: role
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}
