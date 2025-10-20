"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Navigation from '@/components/Navigation';
import {
  ChevronRight,
  Building2,
  LayoutDashboard,
  FolderKanban,
  Users,
  X,
  Menu,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  companyId: string;
}

interface Company {
  id: string;
  name: string;
  enterpriseId: string;
  projects: Project[];
}

interface Enterprise {
  id: string;
  name: string;
  ownerUserId?: string;
  companies: Company[];
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string>('');
  // Removed unused selectedCompanyId
  const [loading, setLoading] = useState(true);
  // Removed unused showUserMenu
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebarOpen');
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });
  const [expandedSidebarCompany, setExpandedSidebarCompany] = useState<string | null>(null);
  const [showCreateEnterpriseModal, setShowCreateEnterpriseModal] = useState(false);
  const [newEnterpriseName, setNewEnterpriseName] = useState('');
  const [creatingEnterprise, setCreatingEnterprise] = useState(false);
  const [userRole, setUserRole] = useState<string>('member');

  useEffect(() => {
    if ((session as any)?.userId) {
      // Sync memberships for users who were assigned before the fix
      const syncMemberships = async () => {
        try {
          const response = await fetch('/api/users/sync-memberships', { method: 'POST' });
          const data = await response.json();
          console.log('Membership sync result:', data);
        } catch (err) {
          console.error('Failed to sync memberships:', err);
        }
      };
      
      syncMemberships().then(() => {
        // Small delay to ensure database updates are complete
        setTimeout(() => {
          fetchEnterprises();
        }, 100);
      });
    }
  }, [session]);

  useEffect(() => {
    // Mobile dropdown positioning fix
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const handleSelectFocus = (e: FocusEvent) => {
      const select = e.target as HTMLSelectElement;
      if (select.tagName !== 'SELECT') return;
      
      // Add class for CSS overrides
      document.body.classList.add('mobile-select-open');
      
      // Force iOS to recalculate position by scrolling element into view
      setTimeout(() => {
        select.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest' 
        });
        
        // Additional hack: temporarily change and restore the select size
        const originalSize = select.size;
        select.size = 2;
        setTimeout(() => {
          select.size = originalSize || 0;
        }, 0);
      }, 100);
    };

    const handleSelectBlur = (e: FocusEvent) => {
      const select = e.target as HTMLSelectElement;
      if (select.tagName !== 'SELECT') return;
      document.body.classList.remove('mobile-select-open');
    };

    // Use capture phase to catch events before they bubble
    document.addEventListener('focus', handleSelectFocus, true);
    document.addEventListener('blur', handleSelectBlur, true);
    
    return () => {
      document.removeEventListener('focus', handleSelectFocus, true);
      document.removeEventListener('blur', handleSelectBlur, true);
      document.body.classList.remove('mobile-select-open');
    };
  }, []);

  // Save selected enterprise to localStorage and notify other components
  useEffect(() => {
    if (selectedEnterpriseId) {
      localStorage.setItem('selectedEnterpriseId', selectedEnterpriseId);
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('enterpriseChanged'));
    }
  }, [selectedEnterpriseId]);

  // Save sidebar state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', sidebarOpen.toString());
    }
  }, [sidebarOpen]);

  // Listen for external enterprise selection changes (from Navigation)
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

  const fetchEnterprises = async () => {
    try {
      setLoading(true);

      const enterprisesRes = await fetch('/api/enterprises', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (enterprisesRes.ok) {
        const data = await enterprisesRes.json();
        console.log('Fetched enterprises:', data.enterprises);
        const fetchedEnterprises = data.enterprises || [];

        const enterprisesWithCompanies = await Promise.all(
          fetchedEnterprises.map(async (enterprise: Enterprise) => {
            const companiesRes = await fetch(`/api/enterprises/${enterprise.id}/companies`);
            const companiesData = await companiesRes.json();
            const companies = companiesData.companies || [];

            const companiesWithProjects = await Promise.all(
              companies.map(async (company: Company) => {
                const projectsRes = await fetch(`/api/projects?companyId=${company.id}`);
                const projectsData = await projectsRes.json();
                return {
                  ...company,
                  projects: projectsData.projects || []
                };
              })
            );

            return {
              ...enterprise,
              companies: companiesWithProjects
            };
          })
        );

        setEnterprises(enterprisesWithCompanies);
        
        if (enterprisesWithCompanies.length > 0) {
          // Choose selected enterprise in this order:
          // 1) stored selection if it still exists (honor explicit user choice)
          // 2) an enterprise owned by the current user
          // 3) fallback to the first in the list
          const storedEnterpriseId = localStorage.getItem('selectedEnterpriseId');
          const userId = (session as any)?.userId;
          const ownedEnterprise = userId
            ? enterprisesWithCompanies.find(e => e.ownerUserId === userId)
            : undefined;
          const storedExists = storedEnterpriseId && enterprisesWithCompanies.find(e => e.id === storedEnterpriseId);
          const enterpriseToSelect = (storedExists ? storedEnterpriseId : undefined)
            || (ownedEnterprise ? ownedEnterprise.id : undefined)
            || enterprisesWithCompanies[0].id;

          setSelectedEnterpriseId(enterpriseToSelect as string);

          const selectedEnt = enterprisesWithCompanies.find(e => e.id === enterpriseToSelect);

          // Compute role for the selected enterprise
          if (userId && selectedEnt) {
            if (userId === selectedEnt.ownerUserId) {
              setUserRole('owner');
            } else {
              try {
                const memberRes = await fetch(`/api/enterprises/${selectedEnt.id}/members`);
                if (memberRes.ok) {
                  const memberData = await memberRes.json();
                  const userMember = memberData.members?.find((m: any) => m.userId === userId);
                  setUserRole(userMember?.role || 'member');
                } else {
                  setUserRole('member');
                }
              } catch (err) {
                console.error('Failed to fetch user role:', err);
                setUserRole('member');
              }
            }
          } else {
            setUserRole('member');
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch enterprises:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleCreateEnterprise = async () => {
    if (!newEnterpriseName.trim()) return;
    
    setCreatingEnterprise(true);
    try {
      const response = await fetch('/api/enterprises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newEnterpriseName.trim() }),
      });

      if (response.ok) {
        const newEnterprise = await response.json();
        // Refresh enterprises list
        await fetchEnterprises();
        // Select the newly created enterprise
        setSelectedEnterpriseId(newEnterprise.id);
        // Close modal and reset form
        setShowCreateEnterpriseModal(false);
        setNewEnterpriseName('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create enterprise');
      }
    } catch (error) {
      console.error('Error creating enterprise:', error);
      alert('Failed to create enterprise');
    } finally {
      setCreatingEnterprise(false);
    }
  };

  const handleProjectClick = (companyId: string, projectId: string) => {
    router.push(`/planner?companyId=${companyId}&projectId=${projectId}`);
  };

  const toggleSidebarCompany = (companyId: string) => {
    setExpandedSidebarCompany(expandedSidebarCompany === companyId ? null : companyId);
  };

  const selectedEnterprise = enterprises.find(e => e.id === selectedEnterpriseId);
  const companiesInSelectedEnterprise = selectedEnterprise?.companies || [];
  
  // Recompute role whenever the selected enterprise changes
  useEffect(() => {
    const updateRole = async () => {
      if (!selectedEnterpriseId || !(session as any)?.userId) return;
      const ent = enterprises.find(e => e.id === selectedEnterpriseId);
      const userId = (session as any).userId;
      if (!ent) return;
      if (userId === ent.ownerUserId) {
        setUserRole('owner');
        return;
      }
      try {
        const memberRes = await fetch(`/api/enterprises/${ent.id}/members`);
        if (memberRes.ok) {
          const memberData = await memberRes.json();
          const userMember = memberData.members?.find((m: any) => m.userId === userId);
          setUserRole(userMember?.role || 'member');
        } else {
          setUserRole('member');
        }
      } catch (err) {
        console.error('Failed to fetch user role:', err);
        setUserRole('member');
      }
    };
    updateRole();
    
    // Listen for role changes
    const handleRoleChange = () => {
      updateRole();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('roleChanged', handleRoleChange);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('roleChanged', handleRoleChange);
      }
    };
  }, [selectedEnterpriseId, enterprises, session]);
  
  // Check if user is owner or admin of the selected enterprise
  const isOwnerOrAdmin = selectedEnterprise && session && 
    ((session as any).userId === selectedEnterprise.ownerUserId ||
     userRole === 'owner' || userRole === 'admin' || userRole === 'company_admin');

  // Redirect non-owners away from management pages
  useEffect(() => {
    if (!loading && !isOwnerOrAdmin && session) {
      const managementPaths = ['/dashboard', '/companies', '/settings'];
      const isManagementPage = managementPaths.some(path => 
        pathname === path || pathname?.startsWith(`${path}/`)
      );
      
      if (isManagementPage) {
        // Redirect to their first project planner or home
        if (companiesInSelectedEnterprise.length > 0 && companiesInSelectedEnterprise[0].projects.length > 0) {
          const firstProject = companiesInSelectedEnterprise[0].projects[0];
          router.push(`/planner?companyId=${companiesInSelectedEnterprise[0].id}&projectId=${firstProject.id}`);
        } else {
          router.push('/');
        }
      }
    }
  }, [loading, isOwnerOrAdmin, pathname, session, companiesInSelectedEnterprise, router]);

  if (!(session as any)?.userId) return null;

  return (
    <div className="min-h-screen gh-hero-gradient w-full">
      {/* Unified Top Navigation */}
      <Navigation />



      {/* Main Container with Sidebar */}
      <div className="flex pt-24 min-h-screen">
        {/* Left Sidebar */}
        <aside className={`${sidebarOpen ? 'w-80' : 'w-20'} fixed left-0 top-24 bottom-0 bg-[#0f1729] border-r border-white/10 overflow-y-auto overflow-x-hidden transition-all duration-200 z-20`} style={{ fontSize: '1.1rem' }}>
          <div className={`${sidebarOpen ? 'p-4' : 'py-4 px-2'} space-y-2`}>
            <div className="flex justify-center mb-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
            {/* Management Section (Only for owners/admins) */}
            {isOwnerOrAdmin && (
            <div className={`${sidebarOpen ? 'space-y-1' : 'space-y-2'}`}>
              {sidebarOpen && (
              <div className="text-xs font-semibold text-slate-400 uppercase px-4 mb-3 whitespace-nowrap tracking-wider">
                Management
              </div>
              )}

              {/* Dashboard */}
              <a
                href="/dashboard"
                className={`flex items-center ${sidebarOpen ? 'px-4 py-3' : 'justify-center py-3 mx-2'} text-base font-medium rounded-lg transition-all group relative ${
                  pathname === '/dashboard'
                    ? 'bg-orange-500/10 text-orange-400 border-l-2 border-orange-400'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                title={!sidebarOpen ? 'Dashboard' : ''}
              >
                <LayoutDashboard className={`${sidebarOpen ? 'w-5 h-5 mr-3' : 'w-6 h-6'} transition-all`} />
                {sidebarOpen && 'Dashboard'}
              </a>

              {/* Members */}
              <a
                href="/dashboard/members"
                className={`flex items-center ${sidebarOpen ? 'px-4 py-3' : 'justify-center py-3 mx-2'} text-base font-medium rounded-lg transition-all group relative ${
                  pathname === '/dashboard/members'
                    ? 'bg-orange-500/10 text-orange-400 border-l-2 border-orange-400'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                title={!sidebarOpen ? 'Members' : ''}
              >
                <Users className={`${sidebarOpen ? 'w-5 h-5 mr-3' : 'w-6 h-6'} transition-all`} />
                {sidebarOpen && 'Members'}
              </a>

              {/* Companies */}
              <a
                href="/companies"
                className={`flex items-center ${sidebarOpen ? 'px-4 py-3' : 'justify-center py-3 mx-2'} text-base font-medium rounded-lg transition-all group relative ${
                  pathname === '/companies' || pathname?.startsWith('/companies/')
                    ? 'bg-orange-500/10 text-orange-400 border-l-2 border-orange-400'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                title={!sidebarOpen ? 'Companies' : ''}
              >
                <Building2 className={`${sidebarOpen ? 'w-5 h-5 mr-3' : 'w-6 h-6'} transition-all`} />
                {sidebarOpen && 'Companies'}
              </a>

              {/* Projects */}
              <a
                href="/dashboard/projects"
                className={`flex items-center ${sidebarOpen ? 'px-4 py-3' : 'justify-center py-3 mx-2'} text-base font-medium rounded-lg transition-all group relative ${
                  pathname === '/dashboard/projects'
                    ? 'bg-orange-500/10 text-orange-400 border-l-2 border-orange-400'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                title={!sidebarOpen ? 'Projects' : ''}
              >
                <FolderKanban className={`${sidebarOpen ? 'w-5 h-5 mr-3' : 'w-6 h-6'} transition-all`} />
                {sidebarOpen && 'Projects'}
              </a>
            </div>
            )}

            {/* Divider */}
            {isOwnerOrAdmin && (
              <div className={`${sidebarOpen ? 'border-t border-white/10 my-4' : 'border-t border-white/5 my-3'}`}></div>
            )}

            {/* Company & Project Boards Section - Only show when expanded */}
            {sidebarOpen && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-400 uppercase px-4 mb-3 whitespace-nowrap tracking-wider">
                Company & Project Boards
              </div>

              {loading ? (
                <div className="px-4 py-3 text-base text-slate-400">Loading...</div>
              ) : companiesInSelectedEnterprise.length > 0 ? (
                companiesInSelectedEnterprise.map((company) => (
                  <div key={company.id} className="space-y-1">
                    <button
                      onClick={() => toggleSidebarCompany(company.id)}
                      className="flex items-center justify-between w-full px-4 py-3 text-base font-medium text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <div className="flex items-center">
                        <Building2 className="w-5 h-5 mr-3 text-green-400" />
                        {company.name}
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 transition-transform ${
                          expandedSidebarCompany === company.id ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    {expandedSidebarCompany === company.id && (
                      <div className="ml-6 space-y-1">
                        {company.projects.length > 0 ? (
                          company.projects.map((project) => (
                            <button
                              key={project.id}
                              onClick={() => handleProjectClick(company.id, project.id)}
                              className="flex items-center w-full px-4 py-2 text-base text-slate-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                            >
                              <FolderKanban className="w-5 h-5 mr-3" />
                              {project.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-base text-slate-400">No projects</div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-base text-slate-400">No companies found</div>
              )}
            </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={`flex-1 ${sidebarOpen ? 'ml-80' : 'ml-20'} transition-all duration-200`}>
          {children}
        </main>
      </div>

      {/* Create Enterprise Modal */}
      {showCreateEnterpriseModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a2332] border border-white/10 rounded-lg p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Create New Enterprise</h3>
              <button 
                onClick={() => {
                  setShowCreateEnterpriseModal(false);
                  setNewEnterpriseName('');
                }} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-slate-300 mb-4">
              Create a new enterprise to manage separate companies, projects, and team members.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Enterprise Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newEnterpriseName}
                  onChange={(e) => setNewEnterpriseName(e.target.value)}
                  placeholder="e.g., Acme Corporation"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newEnterpriseName.trim()) {
                      handleCreateEnterprise();
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreateEnterprise}
                  disabled={!newEnterpriseName.trim() || creatingEnterprise}
                  className="flex-1 gh-cta-button px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creatingEnterprise ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Enterprise'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCreateEnterpriseModal(false);
                    setNewEnterpriseName('');
                  }}
                  disabled={creatingEnterprise}
                  className="px-4 py-3 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

