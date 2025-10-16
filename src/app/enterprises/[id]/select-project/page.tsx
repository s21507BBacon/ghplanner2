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
      // Load companies in this enterprise
      const companiesRes = await fetch(`/api/enterprises/${enterpriseId}/companies`);
      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData.companies || []);
      }

      // Load all projects (we'll filter by company on the client)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || submitting) return;

    setSubmitting(true);
    try {
      // Assign user to the selected project
      const response = await fetch(`/api/enterprises/${enterpriseId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: (session as any)?.userId,
          companyId: selectedCompany,
          projectId: selectedProject,
        }),
      });

      if (response.ok) {
        // Store the selected enterprise ID
        localStorage.setItem('selectedEnterpriseId', enterpriseId);
        // Redirect to the project planner
        router.push(`/planner?projectId=${selectedProject}`);
      } else {
        throw new Error('Failed to assign to project');
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
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Your Enterprise!</h1>
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
