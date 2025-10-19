'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CheckCircle2, Info } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';

interface Project {
  id: string;
  name: string;
  description?: string;
  maxSeats: number;
  currentSeats?: number;
}

interface Preference {
  id: string;
  projectId: string;
  rank: number;
  status: string;
  projectName?: string;
}

interface Company {
  id: string;
  name: string;
  enterpriseId?: string;
}

export default function SelectPreferencesPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [existingPreferences, setExistingPreferences] = useState<Preference[]>([]);
  const [selectedPreferences, setSelectedPreferences] = useState<{
    [rank: number]: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

      // Load enterprise to check allocation mode
      let enterpriseAllocationMode = 'auto';
      if (companyData?.company?.enterpriseId) {
        const enterpriseRes = await fetch('/api/enterprises');
        if (enterpriseRes.ok) {
          const enterpriseData = await enterpriseRes.json();
          const enterprise = enterpriseData.enterprises?.find(
            (e: any) => e.id === companyData.company.enterpriseId
          );
          enterpriseAllocationMode = enterprise?.allocationMode || 'auto';
        }
      }

      // Load available projects
      const projectsRes = await fetch(`/api/projects?companyId=${companyId}`);
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        
        // Only show projects if enterprise has manual-preference allocation mode
        if (enterpriseAllocationMode === 'manual-preference') {
          setProjects(projectsData.projects || []);
        } else {
          setProjects([]);
        }
      }

      // Load existing preferences
      const prefsRes = await fetch(`/api/companies/${companyId}/preferences`);
      if (prefsRes.ok) {
        const data = await prefsRes.json();
        setExistingPreferences(data.preferences || []);
        
        // Populate selected preferences from existing
        const selected: { [rank: number]: string } = {};
        data.preferences?.forEach((pref: Preference) => {
          selected[pref.rank] = pref.projectId;
        });
        setSelectedPreferences(selected);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setMessage({ type: 'error', text: 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (rank: number, projectId: string) => {
    setSelectedPreferences(prev => {
      const updated = { ...prev };
      
      // Remove this project from any other rank
      Object.keys(updated).forEach(key => {
        if (updated[parseInt(key)] === projectId && parseInt(key) !== rank) {
          delete updated[parseInt(key)];
        }
      });
      
      // Set the new preference
      if (projectId) {
        updated[rank] = projectId;
      } else {
        delete updated[rank];
      }
      
      return updated;
    });
  };

  const handleSubmit = async () => {
    const preferencesArray = Object.entries(selectedPreferences)
      .filter(([_, projectId]) => projectId)
      .map(([rank, projectId]) => ({
        projectId,
        rank: parseInt(rank)
      }));

    if (preferencesArray.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one preference' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/companies/${companyId}/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: preferencesArray })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Preferences submitted successfully! Waiting for admin allocation.' });
        await loadData(); // Reload to show updated status
      } else {
        setMessage({ type: 'error', text: 'Failed to submit preferences' });
      }
    } catch (err) {
      console.error('Failed to submit preferences:', err);
      setMessage({ type: 'error', text: 'Failed to submit preferences' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearPreferences = async () => {
    if (!confirm('Are you sure you want to clear your preferences?')) return;

    try {
      const res = await fetch(`/api/companies/${companyId}/preferences`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setSelectedPreferences({});
        setMessage({ type: 'success', text: 'Preferences cleared' });
        await loadData();
      }
    } catch (err) {
      console.error('Failed to clear preferences:', err);
      setMessage({ type: 'error', text: 'Failed to clear preferences' });
    }
  };

  const getProjectStatus = (projectId: string) => {
    const pref = existingPreferences.find(p => p.projectId === projectId);
    if (pref) {
      if (pref.status === 'allocated') return 'Allocated ✓';
      if (pref.status === 'rejected') return 'Not Allocated';
      return 'Pending';
    }
    return null;
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

  const hasAllocated = existingPreferences.some(p => p.status === 'allocated');

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white">{company.name}</h1>
          <p className="text-slate-400 mt-1">Select your project preferences</p>
        </div>

        {/* Info Box */}
        <div className="gh-feature-card rounded-lg p-6 bg-blue-500/10 border-blue-500/30">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-300 mb-1">How it works</h3>
              <p className="text-sm text-slate-300">
                Select up to 3 project preferences in order of your choice. The admin will review all preferences and allocate users to projects. You'll be notified once the allocation is complete.
              </p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`gh-feature-card rounded-lg p-4 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <p className={message.type === 'success' ? 'text-green-300' : 'text-red-300'}>
              {message.text}
            </p>
          </div>
        )}

        {/* Already Allocated */}
        {hasAllocated && (
          <div className="gh-feature-card rounded-lg p-6 bg-green-500/10 border-green-500/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-300 mb-2">You've been allocated!</h3>
                <p className="text-sm text-slate-300 mb-3">
                  You have been assigned to a project. Check your allocated project below.
                </p>
                {existingPreferences.filter(p => p.status === 'allocated').map(pref => (
                  <div key={pref.id} className="flex items-center gap-2">
                    <span className="text-white font-medium">{pref.projectName}</span>
                    <button
                      onClick={() => {
                        const project = projects.find(p => p.id === pref.projectId);
                        if (project) {
                          router.push(`/planner?companyId=${companyId}&projectId=${project.id}`);
                        }
                      }}
                      className="text-orange-400 hover:text-orange-300 text-sm underline"
                    >
                      Go to Project
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preference Selection */}
        {!hasAllocated && projects.length > 0 && (
          <div className="gh-feature-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Your Preferences</h2>
            
            <div className="space-y-4">
              {[1, 2, 3].map(rank => (
                <div key={rank}>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'} Preference
                  </label>
                  <select
                    value={selectedPreferences[rank] || ''}
                    onChange={(e) => handlePreferenceChange(rank, e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  >
                    <option value="" className="bg-[#1a2332]">Select a project</option>
                    {projects
                      .filter(p => !Object.values(selectedPreferences).includes(p.id) || selectedPreferences[rank] === p.id)
                      .map(project => (
                        <option key={project.id} value={project.id} className="bg-[#1a2332]">
                          {project.name} ({project.currentSeats || 0}/{project.maxSeats} seats)
                        </option>
                      ))}
                  </select>
                  {selectedPreferences[rank] && getProjectStatus(selectedPreferences[rank]) && (
                    <p className="text-sm text-slate-400 mt-1">
                      Status: {getProjectStatus(selectedPreferences[rank])}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmit}
                disabled={submitting || Object.keys(selectedPreferences).length === 0}
                className="flex-1 gh-cta-button px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : existingPreferences.length > 0 ? 'Update Preferences' : 'Submit Preferences'}
              </button>
              {existingPreferences.length > 0 && (
                <button
                  onClick={handleClearPreferences}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* No Projects Available */}
        {!hasAllocated && projects.length === 0 && (
          <div className="gh-feature-card rounded-lg p-12 text-center">
            <p className="text-slate-400">No projects available for preference selection</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
