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
  const [enterprises, setEnterprises] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string>('');
  const [showEnterpriseMenu, setShowEnterpriseMenu] = useState(false);
  const [enterpriseMenuPosition, setEnterpriseMenuPosition] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);

  // Refs for click-outside detection
  const companiesRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const enterpriseMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((session as any)?.userId) {
      fetchEnterprises();
    }
  }, [session]);

  // Re-fetch companies when enterprise changes
  useEffect(() => {
    if ((session as any)?.userId && selectedEnterpriseId) {
      fetchUserData();
    }
  }, [session, selectedEnterpriseId]);

  // Load enterprises list for the enterprise switcher
  const fetchEnterprises = async () => {
    try {
      const res = await fetch('/api/enterprises', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.enterprises || []).map((e: any) => ({ id: e.id, name: e.name }));
      setEnterprises(list);
      if (list.length > 0) {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('selectedEnterpriseId') : null;
        const pick = (stored && list.find(e => e.id === stored)) ? stored : list[0].id;
        setSelectedEnterpriseId(pick as string);
      }
    } catch (e) {
      console.error('Failed to fetch enterprises:', e);
    }
  };

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
      
      // Close enterprise menu if clicked outside
      if (enterpriseMenuRef.current && !enterpriseMenuRef.current.contains(event.target as Node)) {
        setShowEnterpriseMenu(false);
      }
      
      // Close mobile menu if clicked outside
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    // Add event listener when any menu is open
    if (showCompanies || showUserMenu || showMobileMenu || showEnterpriseMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCompanies, showUserMenu, showMobileMenu, showEnterpriseMenu]);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync selectedEnterpriseId if changed elsewhere
  useEffect(() => {
    const handler = () => {
      try {
        const stored = localStorage.getItem('selectedEnterpriseId');
        if (stored && stored !== selectedEnterpriseId) {
          setSelectedEnterpriseId(stored);
        }
      } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('enterpriseChanged', handler);
      window.addEventListener('storage', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('enterpriseChanged', handler);
        window.removeEventListener('storage', handler);
      }
    };
  }, [selectedEnterpriseId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Only fetch companies for the selected enterprise
      if (!selectedEnterpriseId) {
        setCompanies([]);
        setLoading(false);
        return;
      }
      
      const assignmentsRes = await fetch('/api/user/assignments');
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        const canAccessDashboard = data.hasCreatedEnterprise || data.isOwnerOrAdmin;
        
        if (!canAccessDashboard && data.hasAssignments) {
          const assignedCompanies = data.assignments.map((c: any) => ({
            id: c.id,
            name: c.name,
            projects: c.projects
          }));
          setCompanies(assignedCompanies);
        } else {
          // Fetch companies for the selected enterprise only
          const companiesResponse = await fetch(`/api/enterprises/${selectedEnterpriseId}/companies`);
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

  if (!(session as any)?.userId && !isHomePage) return <div className="h-0" />;

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
                unoptimized
              />
            </div>
            
            
            {/* Enterprise Dropdown next to logo - Hidden on planner/task pages */}
            {(session as any)?.userId && enterprises.length > 0 && !pathname?.startsWith('/planner') && !pathname?.startsWith('/task') && (
              <>
                <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white mx-2 sm:mx-3">/</span>
                <div className="relative" ref={enterpriseMenuRef}>
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setEnterpriseMenuPosition({ top: rect.bottom + 8, left: rect.left });
                      setShowEnterpriseMenu(!showEnterpriseMenu);
                    }}
                    className="flex items-center gap-2 text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity focus:outline-none"
                  >
                    <span className="truncate max-w-[150px] sm:max-w-none">{enterprises.find(e => e.id === selectedEnterpriseId)?.name || 'Enterprise'}</span>
                    <ChevronDown className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-slate-300 flex-shrink-0" />
                  </button>

                  {showEnterpriseMenu && (
                    isMobile ? (
                      <div className="fixed inset-0 z-[1000]" onClick={() => setShowEnterpriseMenu(false)}>
                        <div
                          className="absolute left-2 right-2 bg-[#1a2332] border border-white/10 rounded-md shadow-xl py-2"
                          style={{ top: `${enterpriseMenuPosition.top}px` }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Enterprises
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {enterprises.map((ent) => (
                              <button
                                key={ent.id}
                                onClick={() => {
                                  setSelectedEnterpriseId(ent.id);
                                  if (typeof window !== 'undefined') {
                                    localStorage.setItem('selectedEnterpriseId', ent.id);
                                    window.dispatchEvent(new Event('enterpriseChanged'));
                                  }
                                  setShowEnterpriseMenu(false);
                                }}
                                className="w-full flex items-center justify-between px-4 py-2.5 text-base text-white hover:bg-white/5 transition-colors"
                              >
                                <span className="font-medium truncate pr-2">{ent.name}</span>
                                {selectedEnterpriseId === ent.id && (
                                  <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                          <div className="border-t border-white/10 mt-2">
                            <a
                              href="/dashboard?action=create"
                              onClick={() => setShowEnterpriseMenu(false)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-base text-white hover:bg-white/5 transition-colors"
                            >
                              <div className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-sm">+</span>
                              </div>
                              <span className="font-medium truncate">Create enterprise</span>
                            </a>
                            <a
                              href="/dashboard?action=join"
                              onClick={() => setShowEnterpriseMenu(false)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-base text-white hover:bg-white/5 transition-colors"
                            >
                              <Building2 className="w-5 h-5 flex-shrink-0" />
                              <span className="font-medium truncate">Join enterprise</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute left-0 mt-2 w-80 max-w-none bg-[#1a2332] border border-white/10 rounded-md shadow-xl py-2 z-[200]">
                        <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Enterprises
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {enterprises.map((ent) => (
                            <button
                              key={ent.id}
                              onClick={() => {
                                setSelectedEnterpriseId(ent.id);
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('selectedEnterpriseId', ent.id);
                                  window.dispatchEvent(new Event('enterpriseChanged'));
                                }
                                setShowEnterpriseMenu(false);
                              }}
                              className="w-full flex items-center justify-between px-4 py-2.5 text-base text-white hover:bg-white/5 transition-colors"
                            >
                              <span className="font-medium truncate pr-2">{ent.name}</span>
                              {selectedEnterpriseId === ent.id && (
                                <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-white/10 mt-2">
                          <a
                            href="/dashboard?action=create"
                            onClick={() => setShowEnterpriseMenu(false)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-base text-white hover:bg-white/5 transition-colors"
                          >
                            <div className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-sm">+</span>
                            </div>
                            <span className="font-medium truncate">Create enterprise</span>
                          </a>
                          <a
                            href="/dashboard?action=join"
                            onClick={() => setShowEnterpriseMenu(false)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-base text-white hover:bg-white/5 transition-colors"
                          >
                            <Building2 className="w-5 h-5 flex-shrink-0" />
                            <span className="font-medium truncate">Join enterprise</span>
                          </a>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-5">
            {/* Home Page Authentication Buttons */}
            {isHomePage && !(session as any)?.userId && (
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
            {(session as any)?.userId && (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-12">
                  <a
                    href="/dashboard"
                    className={`flex items-center text-2xl font-medium ${pathname === '/dashboard' ? 'text-orange-400' : 'text-slate-300 hover:text-white'}`}
                  >
                    <LayoutDashboard className="w-8 h-8 mr-3" />
                    Dashboard
                  </a>

                  <div className="relative" ref={companiesRef}>
                    <button
                      onClick={() => setShowCompanies(!showCompanies)}
                      className="flex items-center text-2xl font-medium text-slate-300 hover:text-white focus:outline-none"
                    >
                      <Building2 className="w-8 h-8 mr-3" />
                      Projects
                      <ChevronDown className="ml-3 w-8 h-8" />
                    </button>

                    {showCompanies && (
                      <div className="absolute right-0 mt-3 w-120 max-w-none bg-[#1a2332] rounded-md shadow-lg border border-white/10 py-2 z-[200] max-h-144 overflow-y-auto">
                        {loading ? (
                          <div className="px-6 py-3 text-xl text-slate-400">Loading...</div>
                        ) : companies.length > 0 ? (
                          <>
                            {companies.map((company) => (
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
                            ))}
                            <div className="border-t border-white/10 mt-2">
                              <a
                                href="/dashboard"
                                onClick={() => setShowCompanies(false)}
                                className="flex items-center w-full px-6 py-3 text-xl font-medium text-orange-400 hover:bg-white/5"
                              >
                                + Join or Create
                              </a>
                            </div>
                          </>
                        ) : (
                          <div>
                            <div className="px-6 py-3 text-xl text-slate-400">No projects found</div>
                            <div className="border-t border-white/10 mt-2">
                              <a
                                href="/dashboard"
                                onClick={() => setShowCompanies(false)}
                                className="flex items-center w-full px-6 py-3 text-xl font-medium text-orange-400 hover:bg-white/5"
                              >
                                + Join or Create Enterprise
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* User Menu - Desktop Only */}
                <div className="hidden md:block relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center text-2xl font-medium text-slate-300 hover:text-white focus:outline-none"
                  >
                    <User className="w-9 h-9 mr-3" />
                    {session.user?.name || session.user?.email || 'User'}
                    <ChevronDown className="ml-3 w-8 h-8" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-3 w-72 max-w-none bg-[#1a2332] rounded-md shadow-lg border border-white/10 py-2 z-[200]">
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
            {isHomePage && !(session as any)?.userId && (
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
            {(session as any)?.userId && (
              <>
                <a
                  href="/dashboard"
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center px-6 py-3 text-xl font-medium ${pathname === '/dashboard' ? 'text-orange-400 bg-white/5' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                >
                  <LayoutDashboard className="w-6 h-6 mr-3" />
                  Dashboard
                </a>
                <div className="border-t border-white/10 mt-3 pt-3">
                  <div className="px-6 py-3 text-lg font-semibold text-slate-400 uppercase">Projects</div>
                  {loading ? (
                    <div className="px-6 py-3 text-xl text-slate-400">Loading...</div>
                  ) : companies.length > 0 ? (
                    <>
                      {companies.map((company) => (
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
                      ))}
                      <div className="border-t border-white/10 mt-2">
                        <a
                          href="/dashboard"
                          onClick={() => setShowMobileMenu(false)}
                          className="flex items-center w-full px-6 py-3 text-xl font-medium text-orange-400 hover:bg-white/5"
                        >
                          + Join or Create
                        </a>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="px-6 py-3 text-xl text-slate-400">No projects found</div>
                      <div className="border-t border-white/10 mt-2">
                        <a
                          href="/dashboard"
                          onClick={() => setShowMobileMenu(false)}
                          className="flex items-center w-full px-6 py-3 text-xl font-medium text-orange-400 hover:bg-white/5"
                        >
                          + Join or Create Enterprise
                        </a>
                      </div>
                    </>
                  )}
                </div>
                
                {/* User Menu in Mobile */}
                <div className="border-t border-white/10 mt-3 pt-3">
                  <div className="px-6 py-3 text-lg font-semibold text-slate-400 uppercase">Account</div>
                  <a
                    href="/settings"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center px-6 py-3 text-xl text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    <Settings className="w-6 h-6 mr-3" />
                    Settings
                  </a>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center w-full px-6 py-3 text-xl text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    <LogOut className="w-6 h-6 mr-3" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
