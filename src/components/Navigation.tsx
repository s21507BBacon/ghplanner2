"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, LogOut, User, Building2, Menu, X, LayoutDashboard, Settings } from 'lucide-react';
import Image from 'next/image';

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

  // Refs for click-outside detection
  const companiesRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.userId) {
      fetchUserData();
    }
  }, [session]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close companies dropdown if clicked outside
      if (companiesRef.current && !companiesRef.current.contains(event.target as Node)) {
        setShowCompanies(false);
        setExpandedCompanyId(null);
      }
      
      // Close user menu if clicked outside
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      
      // Close mobile menu if clicked outside
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    // Add event listener when any menu is open
    if (showCompanies || showUserMenu || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCompanies, showUserMenu, showMobileMenu]);

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
    <nav className="fixed top-0 left-0 right-0 bg-[#1a2332] border-b border-white/10 z-50 backdrop-blur-sm bg-opacity-95" ref={mobileMenuRef} style={{ fontSize: '1.4rem' }}>
      <div className="w-full px-5 sm:px-7 lg:px-10">
        <div className="flex justify-between items-center h-24">
          <div className="flex items-center">
            <div className="relative mr-5">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-orange-500 to-green-500 rounded-full blur-md opacity-35"></div>
              <Image 
                src="/logo.png" 
                alt="GH Planner Logo" 
                width={68} 
                height={68} 
                className="relative"
                priority
              />
            </div>
            <span className="text-3xl font-bold text-white">Gh Planner</span>
          </div>

          <div className="flex items-center space-x-5">
            {/* Home Page Authentication Buttons */}
            {isHomePage && !session?.userId && (
              <div className="hidden md:flex items-center space-x-6">
                <a
                  href="/signin"
                  className="text-slate-300 hover:text-white font-medium transition-colors text-2xl"
                >
                  Sign In
                </a>
                <a
                  href="/signup"
                  className="gh-cta-button px-6 py-3 rounded-lg text-white font-semibold text-xl"
                >
                  Sign Up
                </a>
              </div>
            )}

            {/* Authenticated User Navigation */}
            {session?.userId && (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-12">
                  {isOwnerOrAdmin && (
                    <a
                      href="/dashboard"
                      className={`flex items-center text-2xl font-medium ${pathname === '/dashboard' ? 'text-orange-400' : 'text-slate-300 hover:text-white'}`}
                    >
                      <LayoutDashboard className="w-8 h-8 mr-3" />
                      Dashboard
                    </a>
                  )}

                  <div className="relative" ref={companiesRef}>
                    <button
                      onClick={() => setShowCompanies(!showCompanies)}
                      className="flex items-center text-2xl font-medium text-slate-300 hover:text-white focus:outline-none"
                    >
                      <Building2 className="w-8 h-8 mr-3" />
                      Companies
                      <ChevronDown className="ml-3 w-8 h-8" />
                    </button>

                    {showCompanies && (
                      <div className="absolute right-0 mt-3 w-120 bg-[#1a2332] rounded-md shadow-lg border border-white/10 py-2 z-[100] max-h-144 overflow-y-auto">
                        {loading ? (
                          <div className="px-6 py-3 text-xl text-slate-400">Loading...</div>
                        ) : companies.length > 0 ? (
                          companies.map((company) => (
                            <div key={company.id} className="border-b border-white/10 last:border-b-0">
                              <button
                                onClick={(e) => toggleCompany(company.id, e)}
                                className="flex items-center justify-between w-full px-6 py-3 text-xl font-medium text-white hover:bg-white/5"
                              >
                                <div className="flex items-center">
                                  <Building2 className="w-6 h-6 mr-3 text-green-400" />
                                  {company.name}
                                </div>
                                <ChevronRight
                                  className={`w-6 h-6 transition-transform ${expandedCompanyId === company.id ? 'rotate-90' : ''}`}
                                />
                              </button>

                              {expandedCompanyId === company.id && (
                                <div className="bg-white/5">
                                  {company.projects.length > 0 ? (
                                    company.projects.map((project) => (
                                      <button
                                        key={project.id}
                                        onClick={() => handleProjectClick(company.id, project.id)}
                                        className="block w-full text-left px-12 py-3 text-xl text-slate-300 hover:bg-white/10 hover:text-white"
                                      >
                                        {project.name}
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-12 py-3 text-xl text-slate-400">No projects</div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="px-6 py-3 text-xl text-slate-400">No companies found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center text-2xl font-medium text-slate-300 hover:text-white focus:outline-none"
                  >
                    <User className="w-9 h-9 mr-3" />
                    {session.user?.name || session.user?.email || 'User'}
                    <ChevronDown className="ml-3 w-8 h-8" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-3 w-72 bg-[#1a2332] rounded-md shadow-lg border border-white/10 py-2 z-[100]">
                      <a
                        href="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center w-full px-6 py-3 text-xl text-slate-300 hover:bg-white/5 hover:text-white"
                      >
                        <Settings className="w-6 h-6 mr-3" />
                        Settings
                      </a>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-6 py-3 text-xl text-slate-300 hover:bg-white/5 hover:text-white"
                      >
                        <LogOut className="w-6 h-6 mr-3" />
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
              className="md:hidden p-3 text-slate-300 hover:text-white"
            >
              {showMobileMenu ? <X className="w-9 h-9" /> : <Menu className="w-9 h-9" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-white/10 py-3">
            {/* Home Page Mobile Auth Buttons */}
            {isHomePage && !session?.userId && (
              <div className="px-6 py-3 space-y-3">
                <a
                  href="/signin"
                  onClick={() => setShowMobileMenu(false)}
                  className="block text-slate-300 hover:text-white font-medium transition-colors py-3 text-2xl"
                >
                  Sign In
                </a>
                <a
                  href="/signup"
                  onClick={() => setShowMobileMenu(false)}
                  className="block gh-cta-button px-6 py-3 rounded-lg text-white font-semibold text-center text-xl"
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
                    className={`flex items-center px-6 py-3 text-xl font-medium ${pathname === '/dashboard' ? 'text-orange-400 bg-white/5' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                  >
                    <LayoutDashboard className="w-6 h-6 mr-3" />
                    Dashboard
                  </a>
                )}
                <div className="border-t border-white/10 mt-3 pt-3">
                  <div className="px-6 py-3 text-lg font-semibold text-slate-400 uppercase">Companies</div>
                  {loading ? (
                    <div className="px-6 py-3 text-xl text-slate-400">Loading...</div>
                  ) : companies.length > 0 ? (
                    companies.map((company) => (
                      <div key={company.id} className="mb-3">
                        <button
                          onClick={(e) => toggleCompany(company.id, e)}
                          className="flex items-center justify-between w-full px-6 py-3 text-xl font-medium text-white hover:bg-white/5"
                        >
                          <div className="flex items-center">
                            <Building2 className="w-6 h-6 mr-3 text-green-400" />
                            {company.name}
                          </div>
                          <ChevronRight
                            className={`w-6 h-6 transition-transform ${expandedCompanyId === company.id ? 'rotate-90' : ''}`}
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
                                  className="block w-full text-left px-12 py-3 text-xl text-slate-300 hover:bg-white/10 hover:text-white"
                                >
                                  {project.name}
                                </button>
                              ))
                            ) : (
                              <div className="px-12 py-3 text-xl text-slate-400">No projects</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-3 text-xl text-slate-400">No companies found</div>
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
