"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [enterpriseName, setEnterpriseName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; inviteCode: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; maxSeats: number; currentSeats: number; isFull: boolean; inviteCode: string }>>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (session === null) router.push('/signin');
  }, [session, router]);

  const createEnterprise = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/enterprises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: enterpriseName }),
      });
      if (!res.ok) throw new Error('Failed to create enterprise');
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Failed to create enterprise');
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: companyName }),
      });
      if (!res.ok) throw new Error('Failed to create company');
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const enterpriseRes = await fetch('/api/enterprises/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinCode }),
      });

      if (enterpriseRes.ok) {
        const data = await enterpriseRes.json();
        setEnterpriseId(data.id);
        const companiesRes = await fetch(`/api/enterprises/${data.id}/companies`);
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json();
          const fetchedCompanies = companiesData.companies || [];
          setCompanies(fetchedCompanies);
          
          if (fetchedCompanies.length === 0) {
            setError('This enterprise has no companies yet. Please contact the enterprise admin to create companies first.');
            setLoading(false);
            return;
          }
          
          setShowPreferences(true);
        }
        return;
      }
      
      const companyRes = await fetch('/api/companies/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode }),
      });
      
      if (companyRes.ok) {
        const assignmentsRes = await fetch('/api/user/assignments');
        if (assignmentsRes.ok) {
          const data = await assignmentsRes.json();
          if (!data.isOwnerOrAdmin && data.hasAssignments && data.assignments[0]?.projects[0]) {
            const firstCompany = data.assignments[0];
            const firstProject = firstCompany.projects[0];
            router.push(`/planner?companyId=${firstCompany.id}&projectId=${firstProject.id}`);
          } else {
            router.push('/dashboard');
          }
        }
        return;
      }
      
      const projectRes = await fetch('/api/projects/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode }),
      });
      
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        if (projectData.companyId && projectData.projectId) {
          router.push(`/planner?companyId=${projectData.companyId}&projectId=${projectData.projectId}`);
        } else {
          router.push('/dashboard');
        }
        return;
      }
      
      throw new Error('Invalid join code');
    } catch (e: any) {
      setError(e.message || 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompanyId) {
      (async () => {
        const res = await fetch(`/api/projects/capacity?companyId=${selectedCompanyId}`);
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
          setSelectedProjectId('');
        }
      })();
    } else {
      setProjects([]);
      setSelectedProjectId('');
    }
  }, [selectedCompanyId]);

  const submitPreferences = async () => {
    setLoading(true);
    setError(null);
    setJoinError(null);
    
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    if (selectedProject?.isFull) {
      setJoinError('This project is full. Please select another project.');
      setLoading(false);
      return;
    }
    
    try {
      const companyJoinRes = await fetch('/api/companies/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: companies.find(c => c.id === selectedCompanyId)?.inviteCode }),
      });
      
      if (!companyJoinRes.ok) {
        throw new Error('Failed to join company');
      }
      
      const projectJoinRes = await fetch('/api/projects/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: selectedProject?.inviteCode }),
      });
      
      if (!projectJoinRes.ok) {
        const data = await projectJoinRes.json();
        throw new Error(data.error || 'Failed to join project');
      }
      
      router.push(`/planner?companyId=${selectedCompanyId}&projectId=${selectedProjectId}`);
    } catch (e: any) {
      setError(e.message || 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  if (showPreferences) {
    return (
      <div className="min-h-screen bg-slate-50 pt-16">
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Select Your Preferences</h1>
            <button onClick={() => signOut()} className="px-3 py-2 text-sm bg-slate-200 rounded">Sign out</button>
          </div>
          {error && <div className="mb-4 text-red-600">{error}</div>}
          {joinError && <div className="mb-4 text-orange-600 bg-orange-50 border border-orange-200 p-3 rounded-lg">{joinError}</div>}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            {companies.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No companies available in this enterprise yet.</p>
                <p className="text-sm text-slate-500">Please contact the enterprise administrator to create companies first.</p>
                <button
                  onClick={() => {
                    setShowPreferences(false);
                    setError(null);
                  }}
                  className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg"
                >
                  Go Back
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Company</label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">Select a company</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {selectedCompanyId && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Project</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="">Select a project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id} disabled={p.isFull}>
                          {p.name} {p.isFull ? '(Full)' : `(${p.currentSeats}/${p.maxSeats})`}
                        </option>
                      ))}
                    </select>
                    {projects.length === 0 && (
                      <p className="mt-2 text-sm text-slate-500">No projects available in this company.</p>
                    )}
                  </div>
                )}
                <button
                  onClick={submitPreferences}
                  disabled={!selectedCompanyId || !selectedProjectId || loading || projects.find(p => p.id === selectedProjectId)?.isFull}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Working…' : 'Join Company and Project'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Welcome</h1>
          <button onClick={() => signOut()} className="px-3 py-2 text-sm bg-slate-200 rounded">Sign out</button>
        </div>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-semibold mb-3">Create an Enterprise</h2>
            <p className="text-sm text-slate-600 mb-4">Create an organisation with multiple companies and projects</p>
            <input
              type="text"
              placeholder="Enterprise name"
              value={enterpriseName}
              onChange={(e) => setEnterpriseName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-3"
            />
            <button
              onClick={createEnterprise}
              disabled={!enterpriseName || loading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Working…' : 'Create Enterprise'}
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-semibold mb-3">Create a Company</h2>
            <p className="text-sm text-slate-600 mb-4">Create a standalone company with projects</p>
            <input
              type="text"
              placeholder="Company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-3"
            />
            <button
              onClick={createCompany}
              disabled={!companyName || loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Working…' : 'Create Company'}
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-semibold mb-3">Join with Code</h2>
            <p className="text-sm text-slate-600 mb-4">Join an enterprise, company, or project</p>
            <input
              type="text"
              placeholder="Join code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-3"
            />
            <button
              onClick={handleJoinCode}
              disabled={!joinCode || loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Working…' : 'Join'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

