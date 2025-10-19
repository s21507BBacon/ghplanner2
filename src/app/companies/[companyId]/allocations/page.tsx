'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Users, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';

interface Project {
  id: string;
  name: string;
  description?: string;
  maxSeats: number;
  currentSeats: number;
}

interface UserPreference {
  userId: string;
  userName: string;
  userEmail: string;
  preferences: Array<{
    id: string;
    projectId: string;
    projectName: string;
    rank: number;
    status: string;
  }>;
  allocationStatus: string;
}

interface Company {
  id: string;
  name: string;
  enterpriseId?: string;
}

interface Enterprise {
  id: string;
  name: string;
  allocationMode?: string;
}

export default function AllocationsPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [company, setCompany] = useState<Company | null>(null);
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userPreferences, setUserPreferences] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedView, setSelectedView] = useState<'preferences' | 'projects'>('preferences');

  const companyId = params?.companyId as string;

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load company details
      const companyRes = await fetch(`/api/companies/${companyId}`);
      let companyData = null;
      if (companyRes.ok) {
        companyData = await companyRes.json();
        setCompany(companyData.company);
      }

      // Load enterprise to get allocation mode
      if (companyData?.company?.enterpriseId) {
        const enterpriseRes = await fetch('/api/enterprises');
        if (enterpriseRes.ok) {
          const enterpriseData = await enterpriseRes.json();
          const ent = enterpriseData.enterprises?.find(
            (e: any) => e.id === companyData.company.enterpriseId
          );
          if (ent) {
            setEnterprise(ent);
          }
        }
      }

      // Load projects
      const projectsRes = await fetch(`/api/projects?companyId=${companyId}`);
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
      }

      // Load all preferences for the company
      const prefsRes = await fetch(`/api/companies/${companyId}/preferences`);
      if (prefsRes.ok) {
        const data = await prefsRes.json();
        
        // Group preferences by user
        const userMap = new Map<string, UserPreference>();
        
        data.preferences?.forEach((pref: any) => {
          if (!userMap.has(pref.user_id)) {
            userMap.set(pref.user_id, {
              userId: pref.user_id,
              userName: pref.user_name,
              userEmail: pref.user_email,
              preferences: [],
              allocationStatus: 'pending'
            });
          }
          
          const user = userMap.get(pref.user_id)!;
          user.preferences.push({
            id: pref.id,
            projectId: pref.project_id,
            projectName: pref.project_name,
            rank: pref.rank,
            status: pref.status
          });
          
          // Update allocation status
          if (pref.status === 'allocated') {
            user.allocationStatus = 'allocated';
          }
        });
        
        setUserPreferences(Array.from(userMap.values()));
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setMessage({ type: 'error', text: 'Failed to load allocation data' });
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async (userId: string, projectId: string) => {
    try {
      setAllocating(true);
      const res = await fetch(`/api/companies/${companyId}/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, projectId })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'User allocated successfully' });
        await loadData();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to allocate user' });
      }
    } catch (err) {
      console.error('Failed to allocate:', err);
      setMessage({ type: 'error', text: 'Failed to allocate user' });
    } finally {
      setAllocating(false);
    }
  };

  const handleRemoveAllocation = async (userId: string, projectId: string) => {
    if (!confirm('Are you sure you want to remove this allocation?')) return;

    try {
      const res = await fetch(`/api/companies/${companyId}/allocate?userId=${userId}&projectId=${projectId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Allocation removed' });
        await loadData();
      } else {
        setMessage({ type: 'error', text: 'Failed to remove allocation' });
      }
    } catch (err) {
      console.error('Failed to remove allocation:', err);
      setMessage({ type: 'error', text: 'Failed to remove allocation' });
    }
  };

  const getProjectCapacity = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return { current: 0, max: 0, isFull: true };
    
    return {
      current: project.currentSeats || 0,
      max: project.maxSeats,
      isFull: (project.currentSeats || 0) >= project.maxSeats
    };
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-300">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!company) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-300">Company not found</div>
        </div>
      </AdminLayout>
    );
  }

  const pendingUsers = userPreferences.filter(u => u.allocationStatus === 'pending');
  const allocatedUsers = userPreferences.filter(u => u.allocationStatus === 'allocated');

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <Link 
            href={`/companies/${companyId}`}
            className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Company
          </Link>
          <h1 className="text-3xl font-bold text-white">{company.name} - Project Allocations</h1>
          <p className="text-slate-400 mt-1">Manage user project allocations and preferences</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`gh-feature-card rounded-lg p-4 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <p className={message.type === 'success' ? 'text-green-300' : 'text-red-300'}>
              {message.text}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="gh-feature-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">{pendingUsers.length}</span>
            </div>
            <h3 className="text-slate-400 text-sm">Pending Allocations</h3>
          </div>

          <div className="gh-feature-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-white">{allocatedUsers.length}</span>
            </div>
            <h3 className="text-slate-400 text-sm">Allocated Users</h3>
          </div>

          <div className="gh-feature-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Info className="w-8 h-8 text-orange-400" />
              <span className="text-2xl font-bold text-white">{projects.length}</span>
            </div>
            <h3 className="text-slate-400 text-sm">Total Projects</h3>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedView('preferences')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedView === 'preferences'
                ? 'bg-orange-500 text-white'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            By User Preferences
          </button>
          <button
            onClick={() => setSelectedView('projects')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedView === 'projects'
                ? 'bg-orange-500 text-white'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            By Project
          </button>
        </div>

        {/* By User Preferences View */}
        {selectedView === 'preferences' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">User Preferences</h2>
            
            {pendingUsers.length === 0 && allocatedUsers.length === 0 ? (
              <div className="gh-feature-card rounded-lg p-12 text-center">
                <p className="text-slate-400">No user preferences submitted yet</p>
              </div>
            ) : (
              <>
                {/* Pending Users */}
                {pendingUsers.length > 0 && (
                  <div className="gh-feature-card rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      Pending Allocations ({pendingUsers.length})
                    </h3>
                    <div className="space-y-4">
                      {pendingUsers.map(user => (
                        <div key={user.userId} className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-white">{user.userName}</h4>
                              <p className="text-sm text-slate-400">{user.userEmail}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {user.preferences
                              .sort((a, b) => a.rank - b.rank)
                              .map((pref, idx) => {
                                const capacity = getProjectCapacity(pref.projectId);
                                return (
                                  <div key={pref.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-slate-400 w-16">
                                        {idx + 1 === 1 ? '1st' : idx + 1 === 2 ? '2nd' : '3rd'}
                                      </span>
                                      <div>
                                        <p className="text-white font-medium">{pref.projectName}</p>
                                        <p className="text-xs text-slate-400">
                                          {capacity.current}/{capacity.max} seats
                                          {capacity.isFull && <span className="text-red-400 ml-2">• Full</span>}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleAllocate(user.userId, pref.projectId)}
                                      disabled={allocating || capacity.isFull}
                                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                    >
                                      {capacity.isFull ? 'Full' : 'Allocate'}
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allocated Users */}
                {allocatedUsers.length > 0 && (
                  <div className="gh-feature-card rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      Allocated Users ({allocatedUsers.length})
                    </h3>
                    <div className="space-y-3">
                      {allocatedUsers.map(user => {
                        const allocatedPref = user.preferences.find(p => p.status === 'allocated');
                        if (!allocatedPref) return null;
                        
                        return (
                          <div key={user.userId} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-4">
                            <div>
                              <h4 className="font-semibold text-white">{user.userName}</h4>
                              <p className="text-sm text-slate-400">{user.userEmail}</p>
                              <p className="text-sm text-green-400 mt-1">→ {allocatedPref.projectName}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveAllocation(user.userId, allocatedPref.projectId)}
                              className="px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-600/30 transition-colors text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* By Project View */}
        {selectedView === 'projects' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Projects Overview</h2>
            
            {projects.map(project => {
              const capacity = getProjectCapacity(project.id);
              const usersWanting = userPreferences.filter(u => 
                u.preferences.some(p => p.projectId === project.id)
              );
              const allocatedToProject = userPreferences.filter(u =>
                u.preferences.some(p => p.projectId === project.id && p.status === 'allocated')
              );
              
              return (
                <div key={project.id} className="gh-feature-card rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                      <p className="text-sm text-slate-400">
                        Enterprise Mode: {enterprise?.allocationMode === 'auto' ? 'Auto' : enterprise?.allocationMode === 'manual' ? 'Manual' : 'Manual with Preferences'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{capacity.current}/{capacity.max}</p>
                      <p className="text-xs text-slate-400">Seats</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="w-full bg-white/5 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all ${capacity.isFull ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${(capacity.current / capacity.max) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-300">
                      {usersWanting.length} users interested • {allocatedToProject.length} allocated
                    </p>
                    
                    {allocatedToProject.length > 0 && (
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-400 mb-2">Allocated Users:</p>
                        <div className="flex flex-wrap gap-2">
                          {allocatedToProject.map(user => (
                            <span key={user.userId} className="px-2 py-1 bg-green-500/20 border border-green-500/30 text-green-300 rounded text-xs">
                              {user.userName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
