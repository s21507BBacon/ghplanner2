'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UserPlus, UserMinus, X, ArrowLeft, Search, SlidersHorizontal, ArrowUpDown, Mail, Upload } from 'lucide-react';
import Link from 'next/link';

interface Enterprise {
  id: string;
  name: string;
  inviteCode: string;
  ownerUserId: string;
}

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  assignments: {
    assignmentId: string;
    companyName: string;
    projectName: string;
    companyId: string;
    projectId: string;
  }[];
}

export default function MembersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<Array<{id: string; name: string}>>([]);
  const [availableProjects, setAvailableProjects] = useState<Array<{id: string; name: string; companyId: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [addingMember, setAddingMember] = useState<{ userId: string; userName: string } | null>(null);
  const [selectedAddCompanyId, setSelectedAddCompanyId] = useState<string>('');
  const [selectedAddProjectId, setSelectedAddProjectId] = useState<string>('');
  
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [uploadResult, setUploadResult] = useState<{sent: number, failed: number, errors?: string[]} | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [sendingSingleInvite, setSendingSingleInvite] = useState(false);
  const [singleInviteResult, setSingleInviteResult] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'owner' | 'admin' | 'member'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'assignments' | 'project'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
      return;
    }

    if (status === 'authenticated') {
      loadEnterprises();
    }
  }, [status, router]);

  useEffect(() => {
    if (selectedEnterpriseId) {
      loadMembers();
    }
  }, [selectedEnterpriseId]);

  const loadEnterprises = async () => {
    try {
      const res = await fetch('/api/enterprises');
      if (res.ok) {
        const data = await res.json();
        setEnterprises(data.enterprises || []);
        if (data.enterprises?.length) {
          setSelectedEnterpriseId(data.enterprises[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load enterprises:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!selectedEnterpriseId) return;
    try {
      const res = await fetch(`/api/enterprises/${selectedEnterpriseId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setAvailableCompanies(data.companies || []);
        setAvailableProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const addMemberToProject = async () => {
    if (!addingMember || !selectedAddCompanyId || !selectedAddProjectId) return;
    try {
      const res = await fetch(`/api/enterprises/${selectedEnterpriseId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: addingMember.userId,
          companyId: selectedAddCompanyId,
          projectId: selectedAddProjectId,
        }),
      });
      if (res.ok) {
        await loadMembers();
        setAddingMember(null);
        setSelectedAddCompanyId('');
        setSelectedAddProjectId('');
      }
    } catch (err) {
      console.error('Failed to add member to project:', err);
    }
  };

  const removeMemberFromProject = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/enterprises/${selectedEnterpriseId}/members?assignmentId=${assignmentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadMembers();
      }
    } catch (err) {
      console.error('Failed to remove member from project:', err);
    }
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCSV(true);
    setUploadResult(null);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('csv', file);

      const response = await fetch(`/api/enterprises/${selectedEnterpriseId}/invite`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invites');
      }

      const result = await response.json();
      setUploadResult(result);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      await loadMembers();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploadingCSV(false);
    }
  };

  const handleSendSingleInvite = async () => {
    if (!inviteEmail) return;

    setSendingSingleInvite(true);
    setSingleInviteResult(null);

    try {
      const csvContent = `email,name\n${inviteEmail},${inviteName || ''}`;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('csv', blob, 'invite.csv');

      const response = await fetch(`/api/enterprises/${selectedEnterpriseId}/invite`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invite');
      }

      const result = await response.json();
      if (result.sent > 0) {
        setSingleInviteResult('Invitation sent successfully!');
        setInviteEmail('');
        setInviteName('');
        await loadMembers();
        setTimeout(() => {
          setShowInviteModal(false);
          setSingleInviteResult(null);
        }, 2000);
      } else {
        throw new Error(result.errors?.[0] || 'Failed to send invite');
      }
    } catch (err: any) {
      setSingleInviteResult(err.message);
    } finally {
      setSendingSingleInvite(false);
    }
  };

  const selectedEnterprise = enterprises.find(e => e.id === selectedEnterpriseId);
  const isOwner = selectedEnterprise && session && (session as any).userId === selectedEnterprise.ownerUserId;

  const filteredMembers = members
    .filter(member => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = member.name?.toLowerCase().includes(query);
        const matchesEmail = member.email?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }
      
      if (filterStatus !== 'all') {
        const hasAssignments = member.assignments && member.assignments.length > 0;
        if (filterStatus === 'assigned' && !hasAssignments) return false;
        if (filterStatus === 'unassigned' && hasAssignments) return false;
      }
      
      if (filterRole !== 'all') {
        if (member.role !== filterRole) return false;
      }
      
      return true;
    });

  const filteredAndSortedMembers = [...filteredMembers].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
        break;
      case 'email':
        aValue = a.email?.toLowerCase() || '';
        bValue = b.email?.toLowerCase() || '';
        break;
      case 'role':
        const roleOrder = { owner: 0, admin: 1, member: 2 };
        aValue = roleOrder[a.role as keyof typeof roleOrder] ?? 3;
        bValue = roleOrder[b.role as keyof typeof roleOrder] ?? 3;
        break;
      case 'assignments':
        aValue = a.assignments?.length || 0;
        bValue = b.assignments?.length || 0;
        break;
      case 'project':
        return 0;
      default:
        return 0;
    }
    
    if (sortBy === 'role' || sortBy === 'assignments') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    } else {
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    }
  });

  const groupedByProject = (() => {
    if (sortBy !== 'project') return null;

    interface ProjectGroup {
      projectId: string;
      projectName: string;
      companyName: string;
      members: Member[];
    }

    const projectMap = new Map<string, ProjectGroup>();
    const unassignedMembers: Member[] = [];

    filteredMembers.forEach(member => {
      if (!member.assignments || member.assignments.length === 0) {
        unassignedMembers.push(member);
      } else {
        member.assignments.forEach(assignment => {
          const key = `${assignment.companyId}-${assignment.projectId}`;
          if (!projectMap.has(key)) {
            projectMap.set(key, {
              projectId: assignment.projectId,
              projectName: assignment.projectName,
              companyName: assignment.companyName,
              members: []
            });
          }
          const group = projectMap.get(key)!;
          if (!group.members.find(m => m.userId === member.userId)) {
            group.members.push(member);
          }
        });
      }
    });

    const sortedProjects = Array.from(projectMap.values()).sort((a, b) => {
      const compareCompany = a.companyName.localeCompare(b.companyName);
      if (compareCompany !== 0) return sortOrder === 'asc' ? compareCompany : -compareCompany;
      return sortOrder === 'asc' 
        ? a.projectName.localeCompare(b.projectName)
        : b.projectName.localeCompare(a.projectName);
    });

    return { projects: sortedProjects, unassigned: unassignedMembers };
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-16 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Manage Members</h1>
          </div>
          {selectedEnterprise && isOwner && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Send Invites
            </button>
          )}
        </div>

        {enterprises.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex gap-3 items-center flex-wrap">
              <label className="text-sm font-medium text-slate-700">Enterprise:</label>
              <select 
                value={selectedEnterpriseId} 
                onChange={(e) => setSelectedEnterpriseId(e.target.value)} 
                className="px-3 py-2 border rounded-lg"
              >
                {enterprises.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}


        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">
              Enterprise Members ({filteredAndSortedMembers.length}{filteredAndSortedMembers.length !== members.length && ` of ${members.length}`})
            </h2>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Members</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                </select>

                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as any)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              <span className="text-slate-600 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="role">Role</option>
                <option value="assignments">Assignments Count</option>
                <option value="project">Project</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown className="w-4 h-4 text-slate-600" />
              </button>
              
              <span className="text-xs text-slate-500 ml-1">
                {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
              </span>

              {(searchQuery || filterStatus !== 'all' || filterRole !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                    setFilterRole('all');
                  }}
                  className="ml-auto text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {sortBy === 'project' && groupedByProject ? (
              <>
                {groupedByProject.projects.map((projectGroup) => (
                  <div key={`${projectGroup.companyName}-${projectGroup.projectName}`} className="space-y-3">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-3 rounded-r-lg">
                      <h3 className="font-semibold text-lg text-slate-900">
                        {projectGroup.companyName} → {projectGroup.projectName}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {projectGroup.members.length} member{projectGroup.members.length !== 1 ? 's' : ''} assigned
                      </p>
                    </div>
                    
                    {projectGroup.members.map(member => (
                      <div key={member.id} className="border border-slate-200 rounded-lg p-4 ml-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-slate-600">{member.email}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              <span className={`px-2 py-1 rounded ${
                                member.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {member.role}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setAddingMember({ userId: member.userId, userName: member.name })}
                            className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            <UserPlus className="w-4 h-4" />
                            Add to Project
                          </button>
                        </div>
                        {member.assignments && member.assignments.length > 1 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-slate-700">Other Assignments:</div>
                            {member.assignments
                              .filter(a => a.projectId !== projectGroup.projectId)
                              .map((assignment) => (
                                <div key={assignment.assignmentId} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                                  <div className="text-sm">
                                    <span className="font-medium">{assignment.companyName}</span> → {assignment.projectName}
                                  </div>
                                  <button
                                    onClick={() => removeMemberFromProject(assignment.assignmentId)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Remove from project"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {groupedByProject.unassigned.length > 0 && (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-slate-400 p-3 rounded-r-lg">
                      <h3 className="font-semibold text-lg text-slate-900">
                        Unassigned Members
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {groupedByProject.unassigned.length} member{groupedByProject.unassigned.length !== 1 ? 's' : ''} without project assignments
                      </p>
                    </div>
                    
                    {groupedByProject.unassigned.map(member => (
                      <div key={member.id} className="border border-slate-200 rounded-lg p-4 ml-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-slate-600">{member.email}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              <span className={`px-2 py-1 rounded ${
                                member.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {member.role}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setAddingMember({ userId: member.userId, userName: member.name })}
                            className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            <UserPlus className="w-4 h-4" />
                            Add to Project
                          </button>
                        </div>
                        <div className="text-sm text-slate-500">No project assignments</div>
                      </div>
                    ))}
                  </div>
                )}

                {groupedByProject.projects.length === 0 && groupedByProject.unassigned.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No members match your filters
                  </div>
                )}
              </>
            ) : (
              <>
                {filteredAndSortedMembers.map(member => (
                  <div key={member.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-slate-600">{member.email}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          <span className={`px-2 py-1 rounded ${
                            member.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setAddingMember({ userId: member.userId, userName: member.name })}
                        className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add to Project
                      </button>
                    </div>
                    {member.assignments && member.assignments.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-slate-700">Assigned Projects:</div>
                        {member.assignments.map((assignment) => (
                          <div key={assignment.assignmentId} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                            <div className="text-sm">
                              <span className="font-medium">{assignment.companyName}</span> → {assignment.projectName}
                            </div>
                            <button
                              onClick={() => removeMemberFromProject(assignment.assignmentId)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Remove from project"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No project assignments</div>
                    )}
                  </div>
                ))}
                {filteredAndSortedMembers.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    {members.length === 0 ? 'No members found' : 'No members match your filters'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {addingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add {addingMember.userName} to Project</h3>
              <button onClick={() => {setAddingMember(null); setSelectedAddCompanyId(''); setSelectedAddProjectId('');}} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                <select
                  value={selectedAddCompanyId}
                  onChange={(e) => {setSelectedAddCompanyId(e.target.value); setSelectedAddProjectId('');}}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Select company</option>
                  {availableCompanies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {selectedAddCompanyId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                  <select
                    value={selectedAddProjectId}
                    onChange={(e) => setSelectedAddProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">Select project</option>
                    {availableProjects.filter((p) => p.companyId === selectedAddCompanyId).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={addMemberToProject}
                  disabled={!selectedAddCompanyId || !selectedAddProjectId}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                >
                  Add to Project
                </button>
                <button
                  onClick={() => {setAddingMember(null); setSelectedAddCompanyId(''); setSelectedAddProjectId('');}}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Send Enterprise Invitations</h3>
                <button 
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteName('');
                    setUploadResult(null);
                    setUploadError(null);
                    setSingleInviteResult(null);
                  }} 
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="border-b border-slate-200 pb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-lg">Send Single Invitation</h4>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  Invite a single user by entering their email address
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleSendSingleInvite}
                    disabled={!inviteEmail || sendingSingleInvite}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sendingSingleInvite ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Invitation
                      </>
                    )}
                  </button>

                  {singleInviteResult && (
                    <div className={`p-3 rounded-lg ${
                      singleInviteResult.includes('success') 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      <p className="text-sm">{singleInviteResult}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-lg">Bulk Upload via CSV</h4>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  Upload a CSV file to invite multiple users at once
                </p>

                <div className="mb-4">
                  <label className="block">
                    <span className="sr-only">Choose CSV file</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      disabled={uploadingCSV}
                      className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-purple-50 file:text-purple-700
                        hover:file:bg-purple-100
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </label>
                </div>

                {uploadingCSV && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-blue-800">Sending invitations...</span>
                    </div>
                  </div>
                )}

                {uploadResult && (
                  <div className={`border rounded-lg p-4 ${
                    uploadResult.failed > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <p className="font-medium text-sm mb-2">
                      {uploadResult.sent > 0 && (
                        <span className="text-green-700">
                          Successfully sent {uploadResult.sent} invitation{uploadResult.sent !== 1 ? 's' : ''}
                        </span>
                      )}
                      {uploadResult.failed > 0 && (
                        <span className="text-yellow-700 block">
                          Failed to send {uploadResult.failed} invitation{uploadResult.failed !== 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-sm text-yellow-800 cursor-pointer hover:underline">
                          Show errors
                        </summary>
                        <ul className="mt-2 text-xs text-yellow-700 space-y-1 ml-4">
                          {uploadResult.errors.map((err, idx) => (
                            <li key={idx} className="list-disc">{err}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700">{uploadError}</p>
                  </div>
                )}

                <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-xs text-slate-600 font-medium mb-2">Example CSV format:</p>
                  <pre className="text-xs text-slate-700 bg-white p-3 rounded border border-slate-200 overflow-x-auto">
{`email,name
john@example.com,John Smith
jane@example.com,Jane Doe`}
                  </pre>
                  <p className="text-xs text-slate-500 mt-2">
                    The CSV can have any columns. The system will automatically detect &quot;email&quot;, 
                    and &quot;name&quot; or &quot;first name&quot; columns.
                  </p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteName('');
                  setUploadResult(null);
                  setUploadError(null);
                  setSingleInviteResult(null);
                }}
                className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

