"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Building2, Plus } from 'lucide-react';
import Navigation from '@/components/Navigation';
import AdminLayout from '@/components/AdminLayout';

interface Enterprise { 
  id: string; 
  name: string; 
  inviteCode: string;
  ownerUserId?: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string>('');
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [allEnterprises, setAllEnterprises] = useState<Enterprise[]>([]);
  const [hasEnterprises, setHasEnterprises] = useState(false);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joiningEnterprise, setJoiningEnterprise] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [assigningToProject, setAssigningToProject] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [hasAssignments, setHasAssignments] = useState(false);
  const [userProjects, setUserProjects] = useState<any[]>([]);

  // Listen for enterprise changes from AdminLayout
  useEffect(() => {
    const handleStorageChange = () => {
      const storedEnterpriseId = localStorage.getItem('selectedEnterpriseId');
      if (storedEnterpriseId && storedEnterpriseId !== selectedEnterpriseId) {
        setSelectedEnterpriseId(storedEnterpriseId);
      }
    };

    // Initial load
    const storedEnterpriseId = localStorage.getItem('selectedEnterpriseId');
    if (storedEnterpriseId) {
      setSelectedEnterpriseId(storedEnterpriseId);
    }

    // Listen for changes
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('enterpriseChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('enterpriseChanged', handleStorageChange);
    };
  }, [selectedEnterpriseId]);

  useEffect(() => {
    if (session === null) router.push('/signin');
  }, [session, router]);

  useEffect(() => {
    const loadEnterpriseData = async () => {
      try {
        // Load enterprises
        const res = await fetch('/api/enterprises');
        if (res.ok) {
          const data = await res.json();
          const enterprises = data.enterprises || [];
          setAllEnterprises(enterprises);
          setHasEnterprises(enterprises.length > 0);
          
          if (enterprises.length > 0) {
            const storedEnterpriseId = localStorage.getItem('selectedEnterpriseId');
            const enterpriseId = storedEnterpriseId || enterprises[0].id;
            setSelectedEnterpriseId(enterpriseId);
            const foundEnterprise = enterprises.find((e: Enterprise) => e.id === enterpriseId);
            setEnterprise(foundEnterprise || enterprises[0]);
            
            // Check if user is owner or admin
            const userId = (session as any)?.userId;
            let userIsOwnerOrAdmin = false;
            
            if (userId && foundEnterprise) {
              const isOwner = foundEnterprise.ownerUserId === userId;
              userIsOwnerOrAdmin = isOwner;
            }
            
            // Check user assignments and roles
            const assignmentsRes = await fetch('/api/user/assignments');
            if (assignmentsRes.ok) {
              const assignData = await assignmentsRes.json();
              console.log('Assignment data:', assignData);
              setHasAssignments(assignData.hasAssignments);
              
              // Store user's assigned projects
              if (assignData.assignments && assignData.assignments.length > 0) {
                const allProjects = assignData.assignments.flatMap((company: any) => 
                  company.projects.map((project: any) => ({
                    ...project,
                    companyId: company.id,
                    companyName: company.name
                  }))
                );
                console.log('Extracted projects:', allProjects);
                setUserProjects(allProjects);
              } else {
                console.log('No assignments found or empty array');
              }
              
              // Update isOwnerOrAdmin based on API response
              if (assignData.isOwnerOrAdmin || assignData.hasCreatedEnterprise) {
                userIsOwnerOrAdmin = true;
              }
              
              setIsOwnerOrAdmin(userIsOwnerOrAdmin);
              
              // If no assignments, load available companies and projects
              if (!assignData.hasAssignments) {
                const companiesRes = await fetch(`/api/enterprises/${enterpriseId}/companies`);
                if (companiesRes.ok) {
                  const companiesData = await companiesRes.json();
                  const companies = companiesData.companies || [];
                  
                  // Load projects for each company
                  const companiesWithProjects = await Promise.all(
                    companies.map(async (company: any) => {
                      const projectsRes = await fetch(`/api/projects?companyId=${company.id}`);
                      const projectsData = await projectsRes.json();
                      return {
                        ...company,
                        projects: projectsData.projects || []
                      };
                    })
                  );
                  
                  setAvailableCompanies(companiesWithProjects);
                  if (companiesWithProjects.length > 0) {
                    setSelectedCompanyId(companiesWithProjects[0].id);
                    if (companiesWithProjects[0].projects.length > 0) {
                      setSelectedProjectId(companiesWithProjects[0].projects[0].id);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load enterprise:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (session) {
      loadEnterpriseData();
    }
  }, [session]);

  const handleAssignToProject = async () => {
    if (!selectedCompanyId || !selectedProjectId) {
      setAssignError('Please select a company and project');
      return;
    }
    
    setAssigningToProject(true);
    setAssignError('');
    
    try {
      // Create assignment
      const response = await fetch('/api/projects/self-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: selectedProjectId,
          companyId: selectedCompanyId
        }),
      });
      
      if (response.ok) {
        // Refresh the page to show updated assignments
        window.location.reload();
      } else {
        const error = await response.json();
        setAssignError(error.error || 'Failed to assign to project');
      }
    } catch (error) {
      setAssignError('An error occurred while assigning to project');
    } finally {
      setAssigningToProject(false);
    }
  };

  const handleJoinEnterprise = async () => {
    if (!inviteCode.trim()) {
      setJoinError('Please enter an invite code');
      return;
    }
    
    setJoiningEnterprise(true);
    setJoinError('');
    
    try {
      const response = await fetch('/api/enterprises/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      
      if (response.ok) {
        const data = await response.json();
        router.push(`/enterprises/${data.enterpriseId}/select-project`);
      } else {
        const error = await response.json();
        setJoinError(error.error || 'Failed to join enterprise');
      }
    } catch (error) {
      setJoinError('An error occurred while joining the enterprise');
    } finally {
      setJoiningEnterprise(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gh-hero-gradient">
        <Navigation />
        <div className="pt-24 flex items-center justify-center min-h-screen">
          <div className="text-slate-300">Loading...</div>
        </div>
      </div>
    );
  }

  // Show admin layout for owners/admins with enterprises
  if (hasEnterprises && isOwnerOrAdmin) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-4">Dashboard</h1>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Current Enterprise Info */}
              {enterprise && (
                <div className="gh-feature-card rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Current Enterprise</h2>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-slate-400">Enterprise Name:</span>
                      <p className="text-lg text-white font-medium">{enterprise.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-400">Enterprise Code:</span>
                      <div className="mt-1">
                        <span className="inline-block font-mono bg-white/10 border border-white/20 px-4 py-2 rounded-lg text-orange-400 text-lg">
                          {enterprise.inviteCode}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* All Enterprises */}
              <div className="gh-feature-card rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Your Enterprises ({allEnterprises.length})</h2>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allEnterprises.map((ent) => (
                    <button
                      key={ent.id}
                      onClick={() => {
                        setSelectedEnterpriseId(ent.id);
                        setEnterprise(ent);
                        localStorage.setItem('selectedEnterpriseId', ent.id);
                        window.location.reload();
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        ent.id === selectedEnterpriseId
                          ? 'bg-orange-500/20 border border-orange-500/50 text-white'
                          : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{ent.name}</span>
                        {ent.id === selectedEnterpriseId && (
                          <span className="text-xs bg-orange-500 px-2 py-1 rounded">Active</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Join or Create More */}
            <div className="gh-feature-card rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Expand Your Workspace</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push('/enterprises/create')}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500 to-green-500 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-5 h-5" />
                  Create New Enterprise
                </button>
                <button
                  onClick={() => {
                    const code = prompt('Enter enterprise invite code:');
                    if (code) {
                      setInviteCode(code);
                      handleJoinEnterprise();
                    }
                  }}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  <Building2 className="w-5 h-5" />
                  Join Another Enterprise
                </button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Show simplified layout for normal users
  return (
    <div className="min-h-screen gh-hero-gradient">
      <Navigation />
      <div className="pt-24 px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Building2 className="w-20 h-20 mx-auto mb-6 text-slate-400" />
            <h1 className="text-4xl font-bold text-white mb-4">Welcome to Your Dashboard</h1>
            <p className="text-xl text-slate-300 mb-8">
              {hasEnterprises 
                ? "You're part of an enterprise! Check your companies and projects above."
                : "You're not part of any enterprise yet. Create your own or join an existing one."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Create Enterprise Card */}
              <div className="gh-feature-card rounded-lg p-8">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-orange-500 to-green-500 flex items-center justify-center">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">Create Enterprise</h2>
                  <p className="text-slate-300 mb-6">
                    Start your own enterprise and invite team members to collaborate on projects.
                  </p>
                  <button
                    onClick={() => router.push('/enterprises/create')}
                    className="gh-cta-button w-full px-6 py-3 rounded-lg text-white font-semibold"
                  >
                    Create New Enterprise
                  </button>
                </div>
              </div>

              {/* Join Enterprise Card */}
              <div className="gh-feature-card rounded-lg p-8">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">Join Enterprise</h2>
                  <p className="text-slate-300 mb-6">
                    Have an invite code? Join an existing enterprise and start collaborating.
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Enter invite code"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && inviteCode.trim()) {
                          handleJoinEnterprise();
                        }
                      }}
                    />
                    {joinError && (
                      <p className="text-red-400 text-sm">{joinError}</p>
                    )}
                    <button
                      onClick={handleJoinEnterprise}
                      disabled={!inviteCode.trim() || joiningEnterprise}
                      className="gh-cta-button-secondary w-full px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joiningEnterprise ? 'Joining...' : 'Join Enterprise'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          {hasEnterprises && !hasAssignments && availableCompanies.length > 0 && (
            <div className="gh-feature-card rounded-lg p-8">
              <div className="text-center mb-8">
                <Building2 className="w-16 h-16 mx-auto mb-4 text-orange-400" />
                <h2 className="text-2xl font-bold text-white mb-3">Select Your Workspace</h2>
                <p className="text-slate-300">
                  You're part of an enterprise but haven't been assigned to a project yet. Select a company and project to get started.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Company <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => {
                      setSelectedCompanyId(e.target.value);
                      const company = availableCompanies.find(c => c.id === e.target.value);
                      if (company && company.projects.length > 0) {
                        setSelectedProjectId(company.projects[0].id);
                      } else {
                        setSelectedProjectId('');
                      }
                    }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  >
                    {availableCompanies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Project <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    disabled={!selectedCompanyId}
                  >
                    {selectedCompanyId && availableCompanies
                      .find(c => c.id === selectedCompanyId)
                      ?.projects.map((project: any) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                  </select>
                  {selectedCompanyId && availableCompanies.find(c => c.id === selectedCompanyId)?.projects.length === 0 && (
                    <p className="text-sm text-slate-400 mt-2">No projects available in this company</p>
                  )}
                </div>

                {assignError && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{assignError}</p>
                  </div>
                )}

                <button
                  onClick={handleAssignToProject}
                  disabled={!selectedCompanyId || !selectedProjectId || assigningToProject}
                  className="gh-cta-button w-full px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigningToProject ? 'Assigning...' : 'Join Project'}
                </button>

                <p className="text-sm text-slate-400 text-center">
                  You'll be automatically assigned to this project and can start collaborating immediately.
                </p>
              </div>
            </div>
          )}

          {/* Show additional join/create options for users with enterprises but as members */}
          {hasEnterprises && !isOwnerOrAdmin && (
            <div className="gh-feature-card rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Want More Control?</h2>
              <p className="text-slate-300 mb-4">
                You can create your own enterprise or join additional ones.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push('/enterprises/create')}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500 to-green-500 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-5 h-5" />
                  Create New Enterprise
                </button>
                <button
                  onClick={() => {
                    const code = prompt('Enter enterprise invite code:');
                    if (code) {
                      setInviteCode(code);
                      handleJoinEnterprise();
                    }
                  }}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  <Building2 className="w-5 h-5" />
                  Join Another Enterprise
                </button>
              </div>
            </div>
          )}

          {hasEnterprises && hasAssignments && (
            <div className="gh-feature-card rounded-lg p-8">
              <h2 className="text-2xl font-bold text-white mb-4">Your Projects</h2>
              <p className="text-slate-300 mb-6">
                Click on any project to open its planner board.
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => router.push(`/planner?companyId=${project.companyId}&projectId=${project.id}`)}
                    className="text-left p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-orange-500/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Active</span>
                    </div>
                    <p className="text-sm text-slate-400">{project.companyName}</p>
                  </button>
                ))}
              </div>
              {userProjects.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-400">No projects assigned yet.</p>
                </div>
              )}
            </div>
          )}

          {hasEnterprises && !hasAssignments && availableCompanies.length === 0 && (
            <div className="gh-feature-card rounded-lg p-8 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h2 className="text-2xl font-bold text-white mb-4">No Projects Available</h2>
              <p className="text-slate-300">
                There are no projects available in your enterprise yet. Please contact your administrator.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

