'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Building2, FolderKanban, Star } from 'lucide-react';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  companyId: string;
}

interface Preference {
  rank: number;
  companyId: string;
  projectId: string;
}

export default function SelectPreferencesPage() {
  const router = useRouter();
  const params = useParams();
  const { status } = useSession();
  const enterpriseId = params.id as string;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([
    { rank: 1, companyId: '', projectId: '' },
    { rank: 2, companyId: '', projectId: '' },
    { rank: 3, companyId: '', projectId: '' },
  ]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enterpriseName, setEnterpriseName] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
      return;
    }

    if (status === 'authenticated' && enterpriseId) {
      loadData();
    }
  }, [status, enterpriseId, router]);

  const loadData = async () => {
    try {
      // Fetch enterprise details
      const entRes = await fetch(`/api/enterprises`);
      if (entRes.ok) {
        const entData = await entRes.json();
        const currentEnt = entData.enterprises?.find((e: any) => e.id === enterpriseId);
        if (currentEnt) {
          setEnterpriseName(currentEnt.name);
        }
      }

      // Ensure membership
      await fetch(`/api/enterprises/${enterpriseId}/membership/self`, { method: 'POST' });

      // Load companies in this enterprise
      const companiesRes = await fetch(`/api/enterprises/${enterpriseId}/companies`);
      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData.companies || []);
      }

      // Load all projects
      const projectsRes = await fetch(`/api/enterprises/${enterpriseId}/projects`);
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (rank: number, field: 'companyId' | 'projectId', value: string) => {
    setPreferences(prev => prev.map(p => {
      if (p.rank === rank) {
        const updated = { ...p, [field]: value };
        // Reset project if company changes
        if (field === 'companyId') {
          updated.projectId = '';
        }
        return updated;
      }
      return p;
    }));
  };

  const isPreferenceComplete = (pref: Preference) => {
    return pref.companyId && pref.projectId;
  };

  const shouldShowPreference = (rank: number) => {
    if (rank === 1) return true;
    // Show preference N if preference N-1 is complete
    const previousPref = preferences.find(p => p.rank === rank - 1);
    return previousPref ? isPreferenceComplete(previousPref) : false;
  };

  const getAvailableProjects = (companyId: string) => {
    return projects.filter(p => p.companyId === companyId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validate all preferences are filled
    const validPreferences = preferences.filter(p => p.companyId && p.projectId);
    if (validPreferences.length < 3) {
      alert('Please select all 3 preferences (company + project combinations)');
      return;
    }

    setSubmitting(true);
    try {
      // Group preferences by company
      const companyIds = validPreferences.map(p => p.companyId);
      const uniqueCompanies = companyIds.filter((id, index) => companyIds.indexOf(id) === index);
      
      for (const companyId of uniqueCompanies) {
        const companyPreferences = validPreferences
          .filter(p => p.companyId === companyId)
          .map(p => ({
            projectId: p.projectId,
            rank: p.rank
          }));
        
        // Submit all preferences for this company at once
        // The API will auto-create company membership if needed
        const response = await fetch(`/api/companies/${companyId}/preferences`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preferences: companyPreferences
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit preferences');
        }
      }

      // Store the selected enterprise ID
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedEnterpriseId', enterpriseId);
        window.dispatchEvent(new Event('enterpriseChanged'));
      }

      alert('Preferences submitted successfully! An admin will review and allocate you to a project.');
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to submit preferences:', err);
      alert('Failed to submit preferences. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRankLabel = (rank: number) => {
    switch (rank) {
      case 1: return '1st Choice';
      case 2: return '2nd Choice';
      case 3: return '3rd Choice';
      default: return `${rank}th Choice`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gh-hero-gradient">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to {enterpriseName || 'Your Enterprise'}!
          </h1>
          <p className="text-slate-300 mb-4">
            Select your top 3 company + project preferences. An admin will review your choices and allocate you to a project.
          </p>
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <Star className="w-5 h-5 text-blue-400" />
            <p className="text-sm text-slate-300">
              <strong>Manual Preference Mode:</strong> Your preferences will be reviewed by an administrator who will assign you to a project based on availability and your choices.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {preferences.map((pref) => (
            shouldShowPreference(pref.rank) && (
            <div key={pref.rank} className="gh-feature-card rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{getRankLabel(pref.rank)}</h2>
                  <p className="text-sm text-slate-400">Select a company and project combination</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Company
                  </label>
                  {companies.length === 0 ? (
                    <div className="text-sm text-slate-400 py-2">No companies available</div>
                  ) : (
                    <select
                      value={pref.companyId}
                      onChange={(e) => updatePreference(pref.rank, 'companyId', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                      required
                    >
                      <option value="" className="bg-[#1a2332]">Select a company...</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id} className="bg-[#1a2332]">
                          {company.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Project Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <FolderKanban className="w-4 h-4" />
                    Project
                  </label>
                  {!pref.companyId ? (
                    <div className="text-sm text-slate-400 py-2">Select a company first</div>
                  ) : getAvailableProjects(pref.companyId).length === 0 ? (
                    <div className="text-sm text-slate-400 py-2">No projects available</div>
                  ) : (
                    <select
                      value={pref.projectId}
                      onChange={(e) => updatePreference(pref.rank, 'projectId', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                      required
                    >
                      <option value="" className="bg-[#1a2332]">Select a project...</option>
                      {getAvailableProjects(pref.companyId).map(project => (
                        <option key={project.id} value={project.id} className="bg-[#1a2332]">
                          {project.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
            )
          ))}

          {/* Submit Button - Only show when all 3 are complete */}
          {preferences.every(isPreferenceComplete) && (
          <div className="flex gap-3 justify-end">
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
            >
              Skip for Now
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="gh-cta-button px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Preferences'}
            </button>
          </div>
          )}
        </form>
      </div>
    </div>
  );
}
