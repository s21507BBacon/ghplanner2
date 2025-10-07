"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Edit2, Trash2, X, UserPlus, UserMinus } from 'lucide-react';

interface Enterprise { id: string; name: string; inviteCode: string }
interface Company { id: string; name: string; inviteCode: string; enterpriseId?: string }
interface Project { id: string; name: string; maxSeats: number; isActive: boolean; inviteCode: string }
interface UserPreference { 
  id: string; 
  userId: string; 
  enterpriseId: string; 
  companyId?: string; 
  projectId?: string; 
  status: 'pending' | 'allocated' | 'rejected';
  userName?: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [maxSeats, setMaxSeats] = useState(3);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<UserPreference[]>([]);
  const [editingCompany, setEditingCompany] = useState<{ id: string; name: string } | null>(null);
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; maxSeats: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'company' | 'project'; id: string; name: string } | null>(null);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [enterpriseMembers, setEnterpriseMembers] = useState<Array<any>>([]);
  const [availableProjects, setAvailableProjects] = useState<Array<any>>([]);
  const [availableCompanies, setAvailableCompanies] = useState<Array<any>>([]);
  const [addingMember, setAddingMember] = useState<{ userId: string; userName: string } | null>(null);
  const [selectedAddCompanyId, setSelectedAddCompanyId] = useState<string>('');
  const [selectedAddProjectId, setSelectedAddProjectId] = useState<string>('');
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session === null) router.push('/signin');
  }, [session, router]);

  useEffect(() => {
    (async () => {
      const assignmentsRes = await fetch('/api/user/assignments');
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        
        // Allow dashboard access if user created an enterprise or is owner/admin
        const canAccessDashboard = data.hasCreatedEnterprise || data.isOwnerOrAdmin;
        setIsOwnerOrAdmin(canAccessDashboard);
        
        // Redirect regular members to their projects
        if (!canAccessDashboard && data.hasAssignments) {
          if (data.assignments.length > 0 && data.assignments[0].projects.length > 0) {
            const firstCompany = data.assignments[0];
            const firstProject = firstCompany.projects[0];
            router.push(`/planner?companyId=${firstCompany.id}&projectId=${firstProject.id}`);
          }
          return;
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    (async () => {
      const [enterprisesRes, companiesRes] = await Promise.all([
        fetch('/api/enterprises'),
        fetch('/api/companies')
      ]);
      
      if (enterprisesRes.ok) {
        const data = await enterprisesRes.json();
        setEnterprises(data.enterprises || []);
        if (data.enterprises?.length) {
          setSelectedEnterpriseId(data.enterprises[0].id);
        }
      }
      
      if (companiesRes.ok) {
        const data = await companiesRes.json();
        setCompanies(data.companies || []);
        if (data.companies?.length && !selectedEnterpriseId) {
          setSelectedCompanyId(data.companies[0].id);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedEnterpriseId) {
      (async () => {
        const res = await fetch(`/api/enterprises/${selectedEnterpriseId}/companies`);
        if (res.ok) {
          const data = await res.json();
          const enterpriseCompanies = data.companies || [];
          setCompanies(prev => {
            const standAlone = prev.filter(c => !c.enterpriseId);
            return [...standAlone, ...enterpriseCompanies];
          });
          if (enterpriseCompanies.length) {
            setSelectedCompanyId(enterpriseCompanies[0].id);
          }
        }
        
        const prefsRes = await fetch(`/api/allocations/preview?enterpriseId=${selectedEnterpriseId}`);
        if (prefsRes.ok) {
          const prefsData = await prefsRes.json();
          setPendingUsers(prefsData.pending || []);
        }
      })();
    }
  }, [selectedEnterpriseId]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    (async () => {
      const res = await fetch(`/api/projects?companyId=${selectedCompanyId}`);
      if (!res.ok) return;
      const data = await res.json();
      setProjects(data.projects || []);
    })();
  }, [selectedCompanyId]);

  const createCompany = async () => {
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCompanyName, enterpriseId: selectedEnterpriseId || undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      setCompanies(prev => [...prev, data]);
      setSelectedCompanyId(data.id);
      setNewCompanyName('');
      setShowCreateCompany(false);
    }
  };

  const createProject = async () => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: selectedCompanyId, name: newProjectName, maxSeats }),
    });
    if (res.ok) {
      setNewProjectName('');
      const data = await res.json();
      setProjects(prev => [...prev, data]);
    }
  };

  const allocateUser = async (preferenceId: string, companyId: string, projectId: string) => {
    const res = await fetch('/api/allocations/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferenceId, companyId, projectId }),
    });
    if (res.ok) {
      setPendingUsers(prev => prev.filter(p => p.id !== preferenceId));
    }
  };

  const updateCompany = async () => {
    if (!editingCompany) return;
    const res = await fetch('/api/companies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingCompany.id, name: editingCompany.name }),
    });
    if (res.ok) {
      const data = await res.json();
      setCompanies(prev => prev.map(c => c.id === data.id ? { ...c, name: data.name } : c));
      setEditingCompany(null);
    }
  };

  const deleteCompany = async (id: string) => {
    const res = await fetch(`/api/companies?id=${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setCompanies(prev => prev.filter(c => c.id !== id));
      if (selectedCompanyId === id) {
        setSelectedCompanyId('');
        setProjects([]);
      }
      setDeleteConfirm(null);
    }
  };

  const updateProject = async () => {
    if (!editingProject) return;
    const res = await fetch('/api/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: editingProject.id, 
        companyId: selectedCompanyId,
        name: editingProject.name,
        maxSeats: editingProject.maxSeats
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setProjects(prev => prev.map(p => p.id === data.id ? { ...p, name: data.name, maxSeats: data.maxSeats } : p));
      setEditingProject(null);
    }
  };

  const deleteProject = async (id: string) => {
    const res = await fetch(`/api/projects?id=${id}&companyId=${selectedCompanyId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setProjects(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
    }
  };

  const loadEnterpriseMembers = async () => {
    if (!selectedEnterpriseId) return;
    const res = await fetch(`/api/enterprises/${selectedEnterpriseId}/members`);
    if (res.ok) {
      const data = await res.json();
      setEnterpriseMembers(data.members || []);
      setAvailableCompanies(data.companies || []);
      setAvailableProjects(data.projects || []);
    }
  };

  const addMemberToProject = async () => {
    if (!addingMember || !selectedAddCompanyId || !selectedAddProjectId) return;
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
      await loadEnterpriseMembers();
      setAddingMember(null);
      setSelectedAddCompanyId('');
      setSelectedAddProjectId('');
    }
  };

  const removeMemberFromProject = async (assignmentId: string) => {
    const res = await fetch(`/api/enterprises/${selectedEnterpriseId}/members?assignmentId=${assignmentId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await loadEnterpriseMembers();
    }
  };

  const selectedEnterprise = enterprises.find(e => e.id === selectedEnterpriseId);
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const enterpriseCompanies = companies.filter(c => c.enterpriseId === selectedEnterpriseId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-16 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!isOwnerOrAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-slate-600 mb-4">You don't have permission to access the dashboard.</p>
          <p className="text-sm text-slate-500">Redirecting to your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          {selectedEnterprise ? (
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{selectedEnterprise.name} Dashboard</h1>
              <div className="mt-2 text-sm text-slate-600">
                Enterprise Code: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{selectedEnterprise.inviteCode}</span>
              </div>
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-slate-900">Company Dashboard</h1>
          )}
          {selectedEnterprise && (
            <button
              onClick={() => {
                setShowMemberManagement(!showMemberManagement);
                if (!showMemberManagement) loadEnterpriseMembers();
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              {showMemberManagement ? 'Hide' : 'Manage Members'}
            </button>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex gap-3 items-center flex-wrap">
            <label className="text-sm font-medium text-slate-700">Company:</label>
            <select 
              value={selectedCompanyId} 
              onChange={(e) => setSelectedCompanyId(e.target.value)} 
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Select company</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selectedCompany && (
              <>
                <div className="text-sm text-slate-600">
                  Company Code: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{selectedCompany.inviteCode}</span>
                </div>
                <button
                  onClick={() => setEditingCompany({ id: selectedCompany.id, name: selectedCompany.name })}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit company"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm({ type: 'company', id: selectedCompany.id, name: selectedCompany.name })}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Delete company"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button 
              onClick={() => setShowCreateCompany(true)} 
              className="ml-auto px-4 py-2 bg-purple-600 text-white rounded-lg text-sm"
            >
              + New Company
            </button>
          </div>
          
          {showCreateCompany && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <input 
                value={newCompanyName} 
                onChange={(e) => setNewCompanyName(e.target.value)} 
                placeholder="Company name" 
                className="w-full px-3 py-2 border rounded-lg" 
              />
              <div className="flex gap-2">
                <button 
                  onClick={createCompany} 
                  disabled={!newCompanyName} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  Create Company
                </button>
                <button 
                  onClick={() => {setShowCreateCompany(false); setNewCompanyName('');}} 
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-semibold mb-3">Projects</h2>
            <div className="space-y-3">
              {projects.map(p => (
                <div key={p.id} className="border border-slate-200 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => router.push(`/planner?companyId=${encodeURIComponent(selectedCompanyId)}&projectId=${encodeURIComponent(p.id)}`)}
                      className="flex-1 text-left hover:bg-slate-50 rounded p-2"
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-600">Max seats: {p.maxSeats}</div>
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingProject({ id: p.id, name: p.name, maxSeats: p.maxSeats })}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit project"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'project', id: p.id, name: p.name })}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600">
                    Code: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{p.inviteCode}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t pt-4 space-y-2">
              <input 
                value={newProjectName} 
                onChange={(e) => setNewProjectName(e.target.value)} 
                placeholder="New project name" 
                className="w-full px-3 py-2 border rounded-lg" 
              />
              <input 
                type="number" 
                value={maxSeats} 
                onChange={(e) => setMaxSeats(parseInt(e.target.value||'0',10))} 
                placeholder="Max seats"
                className="w-full px-3 py-2 border rounded-lg" 
              />
              <button 
                onClick={createProject} 
                disabled={!newProjectName || !selectedCompanyId} 
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                + Add Project
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-semibold mb-3">Pending Allocations</h2>
            {pendingUsers.length === 0 ? (
              <p className="text-sm text-slate-600">No pending user requests</p>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map(user => (
                  <div key={user.id} className="border border-slate-200 rounded p-3">
                    <div className="text-sm font-medium">{user.userName || 'User'}</div>
                    <div className="text-xs text-slate-600">
                      Requested: {user.companyId && companies.find(c => c.id === user.companyId)?.name || 'Any company'}
                      {user.projectId && ` - ${projects.find(p => p.id === user.projectId)?.name || 'Project'}`}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          const cId = user.companyId || selectedCompanyId;
                          const pId = user.projectId || projects[0]?.id;
                          if (cId && pId) allocateUser(user.id, cId, pId);
                        }}
                        className="text-xs px-3 py-1 bg-green-600 text-white rounded"
                      >
                        Allocate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showMemberManagement && selectedEnterprise && (
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-semibold mb-4">Enterprise Members & Project Assignments</h2>
            <div className="space-y-4">
              {enterpriseMembers.map(member => (
                <div key={member.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-slate-600">{member.email}</div>
                    </div>
                    <button
                      onClick={() => setAddingMember({ userId: member.id, userName: member.name })}
                      className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add to Project
                    </button>
                  </div>
                  {member.assignments.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-700">Assigned Projects:</div>
                      {member.assignments.map((assignment: any) => (
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
              {enterpriseMembers.length === 0 && (
                <div className="text-center py-8 text-slate-500">No members found</div>
              )}
            </div>
          </div>
        )}
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
                  {availableCompanies.map((c: any) => (
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
                    {availableProjects.filter((p: any) => p.companyId === selectedAddCompanyId).map((p: any) => (
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

      {editingCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Company</h3>
              <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={updateCompany}
                  disabled={!editingCompany.name}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Project</h3>
              <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Seats</label>
                <input
                  type="number"
                  value={editingProject.maxSeats}
                  onChange={(e) => setEditingProject({ ...editingProject, maxSeats: parseInt(e.target.value || '0', 10) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  min="1"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={updateProject}
                  disabled={!editingProject.name || editingProject.maxSeats < 1}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600">Confirm Delete</h3>
              <button onClick={() => setDeleteConfirm(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-700 mb-6">
              Are you sure you want to delete the {deleteConfirm.type} <span className="font-semibold">{deleteConfirm.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteConfirm.type === 'company' ? deleteCompany(deleteConfirm.id) : deleteProject(deleteConfirm.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
