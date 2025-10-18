'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Building2, FolderKanban } from 'lucide-react';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
  description?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  companyId: string;
}

export default function SelectProjectPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const enterpriseId = params.id as string;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enterpriseName, setEnterpriseName] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
      return;
    }

    // If no enterprise ID, redirect to dashboard
    if (status === 'authenticated' && !enterpriseId) {
      console.error('No enterprise ID provided in URL params:', params);
      router.push('/dashboard');
      return;
    }

    if (status === 'authenticated' && enterpriseId) {
      console.log('Loading data for enterprise:', enterpriseId);
      loadData();
    }
  }, [status, enterpriseId, router, params]);

  const loadData = async () => {
    try {
      console.log('loadData called with enterpriseId:', enterpriseId);
      
      // Fetch enterprise details
      try {
        const entRes = await fetch(`/api/enterprises`);
        if (entRes.ok) {
          const entData = await entRes.json();
          const currentEnt = entData.enterprises?.find((e: any) => e.id === enterpriseId);
          if (currentEnt) {
            setEnterpriseName(currentEnt.name);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch enterprise name:', e);
      }
      
      // Ensure membership for the current session user in this enterprise (idempotent)
      try {
        const ensureRes = await fetch(`/api/enterprises/${enterpriseId}/membership/self`, { method: 'POST' });
        console.log('Ensure membership status:', ensureRes.status);
      } catch (e) {
        console.warn('Failed to ensure membership (non-fatal):', e);
      }
      
      // Load companies in this enterprise
      const companiesUrl = `/api/enterprises/${enterpriseId}/companies`;
      console.log('Fetching companies from:', companiesUrl);
      let companiesRes = await fetch(companiesUrl);
      console.log('Companies response status:', companiesRes.status);
      
      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        console.log('Companies data:', companiesData);
        setCompanies(companiesData.companies || []);
      } else {
        if (companiesRes.status === 403) {
          console.log('Retrying companies after ensuring membership...');
          await fetch(`/api/enterprises/${enterpriseId}/membership/self`, { method: 'POST' });
          companiesRes = await fetch(companiesUrl);
          console.log('Companies retry status:', companiesRes.status);
          if (companiesRes.ok) {
            const companiesData = await companiesRes.json();
            console.log('Companies data (retry):', companiesData);
            setCompanies(companiesData.companies || []);
          } else {
            const error = await companiesRes.json();
            console.error('Companies API error (retry):', error);
          }
        } else {
          const error = await companiesRes.json();
          console.error('Companies API error:', error);
        }
      }

      // Load all projects (we'll filter by company on the client)
      const projectsUrl = `/api/enterprises/${enterpriseId}/projects`;
      console.log('Fetching projects from:', projectsUrl);
      let projectsRes = await fetch(projectsUrl);
      console.log('Projects response status:', projectsRes.status);
      
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        console.log('Projects data:', projectsData);
        setProjects(projectsData.projects || []);
      } else {
        if (projectsRes.status === 403) {
          console.log('Retrying projects after ensuring membership...');
          await fetch(`/api/enterprises/${enterpriseId}/membership/self`, { method: 'POST' });
          projectsRes = await fetch(projectsUrl);
          console.log('Projects retry status:', projectsRes.status);
          if (projectsRes.ok) {
            const projectsData = await projectsRes.json();
            console.log('Projects data (retry):', projectsData);
            setProjects(projectsData.projects || []);
          } else {
            const error = await projectsRes.json();
            console.error('Projects API error (retry):', error);
          }
        } else {
          const error = await projectsRes.json();
          console.error('Projects API error:', error);
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || submitting) return;

    setSubmitting(true);
    try {
      // Assign user to the selected project using the assignment API
      const response = await fetch(`/api/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompany,
          projectId: selectedProject,
        }),
      });

      if (response.ok) {
        // Store the selected enterprise ID
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedEnterpriseId', enterpriseId);
          window.dispatchEvent(new Event('enterpriseChanged'));
        }
        // Redirect to the project planner
        if (!enterpriseId) {
          console.error('Missing enterprise ID during project assignment');
          router.push('/dashboard');
          return;
        }
        router.push(`/planner?projectId=${selectedProject}`);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to assign to project';
        alert(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Failed to assign:', err);
      alert('Failed to assign to project. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = selectedCompany
    ? projects.filter(p => p.companyId === selectedCompany)
    : [];

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
      <div className="max-w-3xl mx-auto px-4 py-12">
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
          <p className="text-slate-300">
            Choose a company and project to get started. You can change this later from your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Selection */}
          <div className="gh-feature-card rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Select Company</h2>
                <p className="text-sm text-slate-400">Choose the company you'll be working with</p>
              </div>
            </div>

            {companies.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No companies available yet.</p>
                <p className="text-sm mt-2">Contact your administrator to set up companies.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {companies.map(company => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => {
                      setSelectedCompany(company.id);
                      setSelectedProject(''); // Reset project selection
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedCompany === company.id
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <h3 className="font-semibold text-white mb-1">{company.name}</h3>
                    {company.description && (
                      <p className="text-sm text-slate-400">{company.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Project Selection */}
          {selectedCompany && (
            <div className="gh-feature-card rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Select Project</h2>
                  <p className="text-sm text-slate-400">Choose the project you'll be contributing to</p>
                </div>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>No projects available for this company yet.</p>
                  <p className="text-sm mt-2">Contact your administrator to create projects.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredProjects.map(project => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => setSelectedProject(project.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedProject === project.id
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <h3 className="font-semibold text-white mb-1">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-slate-400">{project.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          {selectedProject && (
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
                {submitting ? 'Joining...' : 'Join Project'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
