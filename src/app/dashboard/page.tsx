"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Edit2, Trash2, X } from 'lucide-react';

interface Enterprise { id: string; name: string; inviteCode: string }
interface Company { id: string; name: string; inviteCode: string; enterpriseId?: string }
interface Project { id: string; name: string; maxSeats: number; isActive: boolean; inviteCode: string }

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
  const [editingCompany, setEditingCompany] = useState<{ id: string; name: string } | null>(null);
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; maxSeats: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'company' | 'project'; id: string; name: string } | null>(null);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);

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


  const selectedEnterprise = enterprises.find(e => e.id === selectedEnterpriseId);
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const enterpriseCompanies = companies.filter(c => c.enterpriseId === selectedEnterpriseId);

  if (loading) {
    return (
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  if (!isOwnerOrAdmin) {
    return (
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">Access Restricted</h2>
          <p className="text-slate-300 mb-4">You don't have permission to access the dashboard.</p>
          <p className="text-sm text-slate-400">Redirecting to your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gh-hero-gradient">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          {selectedEnterprise ? (
            <div>
              <h1 className="text-3xl font-bold text-white">{selectedEnterprise.name} Dashboard</h1>
              <div className="mt-2 text-sm text-slate-300 flex items-center gap-2">
                <span>Enterprise Code:</span>
                <span className="font-mono bg-white/10 border border-white/20 px-3 py-1 rounded-lg text-orange-400">{selectedEnterprise.inviteCode}</span>
              </div>
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-white">Company Dashboard</h1>
          )}
          {selectedEnterprise && (
            <button
              onClick={() => router.push('/dashboard/members')}
              className="gh-cta-button px-6 py-3 rounded-lg text-white font-semibold"
            >
              Manage Members
            </button>
          )}
        </div>

        <div className="gh-feature-card rounded-lg p-6">
          <div className="flex gap-4 items-center flex-wrap">
            <label className="text-sm font-medium text-slate-300">Company:</label>
            <select 
              value={selectedCompanyId} 
              onChange={(e) => setSelectedCompanyId(e.target.value)} 
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            >
              <option value="" className="bg-[#1a2332]">Select company</option>
              {companies.map(c => (
                <option key={c.id} value={c.id} className="bg-[#1a2332]">{c.name}</option>
              ))}
            </select>
            {selectedCompany && (
              <>
                <div className="text-sm text-slate-300 flex items-center gap-2">
                  <span>Company Code:</span>
                  <span className="font-mono bg-white/10 border border-white/20 px-3 py-1 rounded-lg text-green-400">{selectedCompany.inviteCode}</span>
                </div>
                <button
                  onClick={() => setEditingCompany({ id: selectedCompany.id, name: selectedCompany.name })}
                  className="p-2 text-orange-400 hover:bg-white/10 rounded transition-colors"
                  title="Edit company"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm({ type: 'company', id: selectedCompany.id, name: selectedCompany.name })}
                  className="p-2 text-red-400 hover:bg-white/10 rounded transition-colors"
                  title="Delete company"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button 
              onClick={() => setShowCreateCompany(true)} 
              className="ml-auto gh-cta-button-secondary px-5 py-2 rounded-lg font-semibold text-sm bg-transparent"
            >
              + New Company
            </button>
          </div>
          
          {showCreateCompany && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
              <input 
                value={newCompanyName} 
                onChange={(e) => setNewCompanyName(e.target.value)} 
                placeholder="Company name" 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors" 
              />
              <div className="flex gap-3">
                <button 
                  onClick={createCompany} 
                  disabled={!newCompanyName} 
                  className="gh-cta-button px-5 py-2 rounded-lg text-white font-semibold disabled:opacity-50"
                >
                  Create Company
                </button>
                <button 
                  onClick={() => {setShowCreateCompany(false); setNewCompanyName('');}} 
                  className="px-5 py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="gh-feature-card rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Projects</h2>
            <div className="space-y-3">
              {projects.map(p => (
                <div key={p.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-orange-500/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => router.push(`/planner?companyId=${encodeURIComponent(selectedCompanyId)}&projectId=${encodeURIComponent(p.id)}`)}
                      className="flex-1 text-left hover:bg-white/5 rounded-lg p-3 transition-colors"
                    >
                      <div className="font-semibold text-white text-lg">{p.name}</div>
                      <div className="text-sm text-slate-400 mt-1">Max seats: {p.maxSeats}</div>
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingProject({ id: p.id, name: p.name, maxSeats: p.maxSeats })}
                        className="p-2 text-orange-400 hover:bg-white/10 rounded transition-colors"
                        title="Edit project"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'project', id: p.id, name: p.name })}
                        className="p-2 text-red-400 hover:bg-white/10 rounded transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-slate-300 flex items-center gap-2">
                    <span>Code:</span>
                    <span className="font-mono bg-white/10 border border-white/20 px-3 py-1 rounded-lg text-green-400">{p.inviteCode}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-white/10 pt-6 space-y-3">
              <input 
                value={newProjectName} 
                onChange={(e) => setNewProjectName(e.target.value)} 
                placeholder="New project name" 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors" 
              />
              <input 
                type="number" 
                value={maxSeats} 
                onChange={(e) => setMaxSeats(parseInt(e.target.value||'0',10))} 
                placeholder="Max seats"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors" 
              />
              <button 
                onClick={createProject} 
                disabled={!newProjectName || !selectedCompanyId} 
                className="w-full gh-cta-button px-5 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
              >
                + Add Project
              </button>
            </div>
          </div>
        </div>

      {editingCompany && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a2332] border border-white/10 rounded-lg p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Edit Company</h3>
              <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                <input
                  type="text"
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={updateCompany}
                  disabled={!editingCompany.name}
                  className="flex-1 gh-cta-button px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a2332] border border-white/10 rounded-lg p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Edit Project</h3>
              <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Project Name</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Max Seats</label>
                <input
                  type="number"
                  value={editingProject.maxSeats}
                  onChange={(e) => setEditingProject({ ...editingProject, maxSeats: parseInt(e.target.value || '0', 10) })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  min="1"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={updateProject}
                  disabled={!editingProject.name || editingProject.maxSeats < 1}
                  className="flex-1 gh-cta-button px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a2332] border border-red-500/30 rounded-lg p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-red-400">Confirm Delete</h3>
              <button onClick={() => setDeleteConfirm(null)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete the {deleteConfirm.type} <span className="font-semibold text-white">{deleteConfirm.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteConfirm.type === 'company' ? deleteCompany(deleteConfirm.id) : deleteProject(deleteConfirm.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors"
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
