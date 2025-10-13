"use client";

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, LogOut, User, Briefcase, Building2, Menu, X, LayoutDashboard } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  companyId: string;
}

interface Company {
  id: string;
  name: string;
  projects: Project[];
}

export default function Navigation() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompanies, setShowCompanies] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);

  useEffect(() => {
    if (session?.userId) {
      fetchUserData();
    }
  }, [session]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      const assignmentsRes = await fetch('/api/user/assignments');
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        const canAccessDashboard = data.hasCreatedEnterprise || data.isOwnerOrAdmin;
        setIsOwnerOrAdmin(canAccessDashboard);
        
        if (!canAccessDashboard && data.hasAssignments) {
          const assignedCompanies = data.assignments.map((c: any) => ({
            id: c.id,
            name: c.name,
            projects: c.projects
          }));
          setCompanies(assignedCompanies);
        } else {
          const companiesResponse = await fetch('/api/companies');
          const companiesData = await companiesResponse.json();
          const fetchedCompanies = companiesData.companies || [];

          const companiesWithProjects = await Promise.all(
            fetchedCompanies.map(async (company: Company) => {
              const projectsResponse = await fetch(`/api/projects?companyId=${company.id}`);
              const projectsData = await projectsResponse.json();
              return {
                ...company,
                projects: projectsData.projects || []
              };
            })
          );

          setCompanies(companiesWithProjects);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (companyId: string, projectId: string) => {
    setShowCompanies(false);
    setExpandedCompanyId(null);
    router.push(`/planner?companyId=${companyId}&projectId=${projectId}`);
  };

  const toggleCompany = (companyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCompanyId(expandedCompanyId === companyId ? null : companyId);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const isHomePage = pathname === '/';

  if (!session?.userId && !isHomePage) return <div className="h-0" />;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-[#1a2332] border-b border-white/10 z-50 h-16 backdrop-blur-sm bg-opacity-95">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Briefcase className="w-8 h-8 text-orange-500 mr-3" />
            <span className="text-xl font-bold text-white">GH Planner</span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Home Page Authentication Buttons */}
            {isHomePage && !session?.userId && (
              <div className="hidden md:flex items-center space-x-4">
                <a
                  href="/signin"
                  className="text-slate-300 hover:text-white font-medium transition-colors"
                >
                  Sign In
                </a>
                <a
                  href="/signup"
                  className="gh-cta-button px-4 py-2 rounded-lg text-white font-semibold text-sm"
                >
                  Sign Up
                </a>
              </div>
            )}

            {/* Authenticated User Navigation */}
            {session?.userId && (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-8">
                  {isOwnerOrAdmin && (
                    <a
                      href="/dashboard"
                      className={`flex items-center text-sm font-medium ${pathname === '/dashboard' ? 'text-orange-400' : 'text-slate-300 hover:text-white'}`}
                    >
                      <LayoutDashboard className="w-4 h-4 mr-1" />
                      Dashboard
                    </a>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => setShowCompanies(!showCompanies)}
                      className="flex items-center text-sm font-medium text-slate-300 hover:text-white focus:outline-none"
                    >
                      <Building2 className="w-4 h-4 mr-1" />
                      Companies
                      <ChevronDown className="ml-1 w-4 h-4" />
                    </button>

                    {showCompanies && (
                      <div className="absolute right-0 mt-2 w-80 bg-[#1a2332] rounded-md shadow-lg border border-white/10 py-1 z-50 max-h-96 overflow-y-auto">
                        {loading ? (
                          <div className="px-4 py-2 text-sm text-slate-400">Loading...</div>
                        ) : companies.length > 0 ? (
                          companies.map((company) => (
                            <div key={company.id} className="border-b border-white/10 last:border-b-0">
                              <button
                                onClick={(e) => toggleCompany(company.id, e)}
                                className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-white hover:bg-white/5"
                              >
                                <div className="flex items-center">
                                  <Building2 className="w-4 h-4 mr-2 text-green-400" />
                                  {company.name}
                                </div>
                                <ChevronRight
                                  className={`w-4 h-4 transition-transform ${expandedCompanyId === company.id ? 'rotate-90' : ''}`}
                                />
                              </button>

                              {expandedCompanyId === company.id && (
                                <div className="bg-white/5">
                                  {company.projects.length > 0 ? (
                                    company.projects.map((project) => (
                                      <button
                                        key={project.id}
                                        onClick={() => handleProjectClick(company.id, project.id)}
                                        className="block w-full text-left px-8 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
                                      >
                                        {project.name}
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-8 py-2 text-sm text-slate-400">No projects</div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-slate-400">No companies found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center text-sm font-medium text-slate-300 hover:text-white focus:outline-none"
                  >
                    <User className="w-5 h-5 mr-2" />
                    {session.user?.name || session.user?.email || 'User'}
                    <ChevronDown className="ml-1 w-4 h-4" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-[#1a2332] rounded-md shadow-lg border border-white/10 py-1 z-50">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-slate-300 hover:text-white"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-white/10 py-2">
            {/* Home Page Mobile Auth Buttons */}
            {isHomePage && !session?.userId && (
              <div className="px-4 py-2 space-y-2">
                <a
                  href="/signin"
                  onClick={() => setShowMobileMenu(false)}
                  className="block text-slate-300 hover:text-white font-medium transition-colors py-2"
                >
                  Sign In
                </a>
                <a
                  href="/signup"
                  onClick={() => setShowMobileMenu(false)}
                  className="block gh-cta-button px-4 py-2 rounded-lg text-white font-semibold text-center text-sm"
                >
                  Sign Up
                </a>
              </div>
            )}

            {/* Authenticated User Mobile Menu */}
            {session?.userId && (
              <>
                {isOwnerOrAdmin && (
                  <a
                    href="/dashboard"
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center px-4 py-2 text-sm font-medium ${pathname === '/dashboard' ? 'text-orange-400 bg-white/5' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </a>
                )}
                <div className="border-t border-white/10 mt-2 pt-2">
                  <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Companies</div>
                  {loading ? (
                    <div className="px-4 py-2 text-sm text-slate-400">Loading...</div>
                  ) : companies.length > 0 ? (
                    companies.map((company) => (
                      <div key={company.id} className="mb-2">
                        <button
                          onClick={(e) => toggleCompany(company.id, e)}
                          className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-white hover:bg-white/5"
                        >
                          <div className="flex items-center">
                            <Building2 className="w-4 h-4 mr-2 text-green-400" />
                            {company.name}
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${expandedCompanyId === company.id ? 'rotate-90' : ''}`}
                          />
                        </button>

                        {expandedCompanyId === company.id && (
                          <div className="bg-white/5">
                            {company.projects.length > 0 ? (
                              company.projects.map((project) => (
                                <button
                                  key={project.id}
                                  onClick={() => {
                                    handleProjectClick(company.id, project.id);
                                    setShowMobileMenu(false);
                                  }}
                                  className="block w-full text-left px-8 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
                                >
                                  {project.name}
                                </button>
                              ))
                            ) : (
                              <div className="px-8 py-2 text-sm text-slate-400">No projects</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-slate-400">No companies found</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
