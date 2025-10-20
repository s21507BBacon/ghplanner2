'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  UserPlus, X, ArrowLeft, Search, Download, 
  Edit2, Trash2, Camera, ChevronDown, Eye 
} from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import Image from 'next/image';
import MobileSelect from '@/components/MobileSelect';

interface Enterprise {
  id: string;
  name: string;
  inviteCode: string;
  ownerUserId: string;
}

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  username: string;
  role: 'owner' | 'company_admin' | 'project_admin' | 'project_lead' | 'code_reviewer' | 'user';
  status: 'active' | 'inactive' | 'pending';
  imageUrl?: string;
  joinedDate: string;
  lastActive: string;
  assignments: {
    assignmentId: string;
    companyName: string;
    projectName: string;
    companyId: string;
    projectId: string;
  }[];
}

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner', description: 'Full system access' },
  { value: 'company_admin', label: 'Company Admin', description: 'Full access over company and related content' },
  { value: 'project_admin', label: 'Project Admin', description: 'Full access over a specific project' },
  { value: 'project_lead', label: 'Project Lead', description: 'Edit planner elements, move tasks, cannot edit locked tasks' },
  { value: 'code_reviewer', label: 'Code Reviewer', description: 'Comment on discussions of any task' },
  { value: 'user', label: 'User', description: 'Standard user access' },
];

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'owner':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'company_admin':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'project_admin':
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    case 'project_lead':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'code_reviewer':
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    case 'inactive':
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
};

export default function MembersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [sendingSingleInvite, setSendingSingleInvite] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Batch actions state
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  
  // Edit modal state
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editModalData, setEditModalData] = useState<{
    name: string;
    email: string;
    role: string;
    selectedProjects: string[];
  }>({ name: '', email: '', role: '', selectedProjects: [] });
  
  // View member modal state
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  
  // Companies and projects for assignment
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; companyId: string }[]>([]);
  
  // User role in the current enterprise
  const [userRole, setUserRole] = useState<string>('member');

  // Listen for enterprise changes from AdminLayout
  useEffect(() => {
    const handleStorageChange = () => {
      const storedEnterpriseId = localStorage.getItem('selectedEnterpriseId');
      if (storedEnterpriseId && storedEnterpriseId !== selectedEnterpriseId) {
        setSelectedEnterpriseId(storedEnterpriseId);
      }
    };

    const storedEnterpriseId = localStorage.getItem('selectedEnterpriseId');
    if (storedEnterpriseId) {
      setSelectedEnterpriseId(storedEnterpriseId);
    }

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('enterpriseChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('enterpriseChanged', handleStorageChange);
    };
  }, [selectedEnterpriseId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
      return;
    }

    if (status === 'authenticated') {
      loadEnterprises();
    }
  }, [status, router]);

  useEffect(() => {
    if (selectedEnterpriseId) {
      loadMembers();
    }
  }, [selectedEnterpriseId]);

  // Listen for role changes
  useEffect(() => {
    const handleRoleChange = () => {
      loadMembers(); // Reload to get updated role
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('roleChanged', handleRoleChange);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('roleChanged', handleRoleChange);
      }
    };
  }, [selectedEnterpriseId]);

  const loadEnterprises = async () => {
    try {
      const res = await fetch('/api/enterprises');
      if (res.ok) {
        const data = await res.json();
        setEnterprises(data.enterprises || []);
        
        if (data.enterprises?.length && !selectedEnterpriseId) {
          const storedEnterpriseId = localStorage.getItem('selectedEnterpriseId');
          const enterpriseToSelect = storedEnterpriseId && data.enterprises.find((e: Enterprise) => e.id === storedEnterpriseId)
            ? storedEnterpriseId
            : data.enterprises[0].id;
          
          setSelectedEnterpriseId(enterpriseToSelect);
          localStorage.setItem('selectedEnterpriseId', enterpriseToSelect);
        }
      }
    } catch (err) {
      console.error('Failed to load enterprises:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!selectedEnterpriseId) return;
    try {
      const res = await fetch(`/api/enterprises/${selectedEnterpriseId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setCompanies(data.companies || []);
        setProjects(data.projects || []);
        
        // Update current user's role
        const currentUserId = (session as any)?.userId;
        if (currentUserId) {
          const currentUserMember = data.members?.find((m: Member) => m.userId === currentUserId);
          const role = currentUserMember?.role || 'member';
          console.log('[Members Page] Current user ID:', currentUserId);
          console.log('[Members Page] Current user member:', currentUserMember);
          console.log('[Members Page] Setting user role to:', role);
          setUserRole(role);
        }
      }
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string, showAlert: boolean = true) => {
    try {
      const res = await fetch(`/api/enterprises/${selectedEnterpriseId}/members/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        await loadMembers();
        setEditingRole(null);
        // Dispatch event to notify AdminLayout of role change
        window.dispatchEvent(new Event('roleChanged'));
        // Show success message if requested
        if (showAlert) {
          const member = members.find(m => m.userId === userId);
          if (member) {
            alert(`✅ Role updated successfully!\n\nAn email notification has been sent to ${member.email} about their new role.`);
          }
        }
        return true;
      } else {
        const errorData = await res.json();
        if (showAlert) {
          alert(errorData.error || 'Failed to update role');
        }
        console.error('Failed to update role:', errorData);
        return false;
      }
    } catch (err) {
      console.error('Failed to update role:', err);
      if (showAlert) {
        alert('Failed to update role');
      }
      return false;
    }
  };

  const handleImageUpload = async (userId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`/api/enterprises/${selectedEnterpriseId}/members/${userId}/image`, {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        await loadMembers();
        setEditingImage(null);
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Full Name', 'Email', 'Role', 'Status', 'Companies', 'Projects', 'Joined Date'],
      ...filteredMembers.map(member => [
        member.name,
        member.email,
        member.role,
        member.status,
        Array.from(new Set(member.assignments?.map(a => a.companyName) || [])).join('; ') || 'None',
        member.assignments?.map(a => `${a.companyName} - ${a.projectName}`).join('; ') || 'None',
        member.joinedDate || 'N/A'
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) return;

    setSendingSingleInvite(true);

    try {
      const csvContent = `email,name\n${inviteEmail},${inviteName || ''}`;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('csv', blob, 'invite.csv');

      const response = await fetch(`/api/enterprises/${selectedEnterpriseId}/invite`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setInviteEmail('');
        setInviteName('');
        await loadMembers();
        setTimeout(() => {
          setShowInviteModal(false);
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to send invite:', err);
    } finally {
      setSendingSingleInvite(false);
    }
  };

  // Batch selection handlers
  const toggleMemberSelection = (userId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedMembers(newSelection);
    setShowBatchActions(newSelection.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set());
      setShowBatchActions(false);
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.userId)));
      setShowBatchActions(true);
    }
  };

  // Batch action handlers
  const handleBatchDelete = async () => {
    if (!confirm(`Are you sure you want to remove ${selectedMembers.size} member(s)?`)) return;
    
    try {
      const promises = Array.from(selectedMembers).map(userId => 
        fetch(`/api/enterprises/${selectedEnterpriseId}/members/${userId}`, {
          method: 'DELETE'
        })
      );
      await Promise.all(promises);
      await loadMembers();
      setSelectedMembers(new Set());
      setShowBatchActions(false);
    } catch (err) {
      console.error('Failed to batch delete:', err);
      alert('Failed to delete some members');
    }
  };

  const handleBatchRoleChange = async (newRole: string) => {
    try {
      const promises = Array.from(selectedMembers).map(userId => 
        fetch(`/api/enterprises/${selectedEnterpriseId}/members/${userId}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole })
        })
      );
      await Promise.all(promises);
      await loadMembers();
      const memberCount = selectedMembers.size;
      setSelectedMembers(new Set());
      setShowBatchActions(false);
      // Dispatch event to notify AdminLayout of role change
      window.dispatchEvent(new Event('roleChanged'));
      // Show success message
      alert(`✅ Roles updated successfully!\n\n${memberCount} member${memberCount > 1 ? 's' : ''} ${memberCount > 1 ? 'have' : 'has'} been updated and notified via email.`);
    } catch (err) {
      console.error('Failed to batch update roles:', err);
      alert('Failed to update roles for some members');
    }
  };

  const handleBatchAddToProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      const promises = Array.from(selectedMembers).map(userId => 
        fetch(`/api/enterprises/${selectedEnterpriseId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId, 
            companyId: project.companyId, 
            projectId 
          })
        })
      );
      await Promise.all(promises);
      await loadMembers();
      setSelectedMembers(new Set());
      setShowBatchActions(false);
    } catch (err) {
      console.error('Failed to batch add to project:', err);
      alert('Failed to add some members to project');
    }
  };

  // Edit modal handlers
  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setEditModalData({
      name: member.name,
      email: member.email,
      role: member.role,
      selectedProjects: member.assignments?.map(a => a.projectId) || []
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;

    try {
      // Update name and email if changed
      if (editModalData.name !== editingMember.name || editModalData.email !== editingMember.email) {
        await fetch(`/api/users/${editingMember.userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: editModalData.name,
            email: editModalData.email 
          })
        });
      }

      // Update role if changed
      let roleChanged = false;
      if (editModalData.role !== editingMember.role) {
        const success = await handleRoleChange(editingMember.userId, editModalData.role, false);
        if (!success) {
          alert('Failed to update role');
          return;
        }
        roleChanged = true;
      }

      // Handle project assignments
      const currentProjectIds = editingMember.assignments?.map(a => a.projectId) || [];
      const newProjectIds = editModalData.selectedProjects;
      
      // Remove unselected projects
      const toRemove = editingMember.assignments?.filter(a => !newProjectIds.includes(a.projectId));
      if (toRemove) {
        for (const assignment of toRemove) {
          await fetch(`/api/enterprises/${selectedEnterpriseId}/members?assignmentId=${assignment.assignmentId}`, {
            method: 'DELETE'
          });
        }
      }

      // Add new projects
      const toAdd = newProjectIds.filter(pid => !currentProjectIds.includes(pid));
      for (const projectId of toAdd) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          await fetch(`/api/enterprises/${selectedEnterpriseId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: editingMember.userId,
              companyId: project.companyId,
              projectId 
            })
          });
        }
      }

      await loadMembers();
      setEditingMember(null);
      
      // Show success message
      const messages = [];
      if (editModalData.name !== editingMember.name || editModalData.email !== editingMember.email) {
        messages.push('Profile updated');
      }
      if (roleChanged) {
        messages.push('Role updated (email sent)');
      }
      if (toRemove && toRemove.length > 0) {
        messages.push(`${toRemove.length} project${toRemove.length > 1 ? 's' : ''} removed`);
      }
      if (toAdd.length > 0) {
        messages.push(`${toAdd.length} project${toAdd.length > 1 ? 's' : ''} added`);
      }
      
      if (messages.length > 0) {
        alert(`✅ Changes saved successfully!\n\n${messages.join('\n')}`);
      }
    } catch (err) {
      console.error('Failed to save member edits:', err);
      alert('Failed to save changes');
    }
  };

  const selectedEnterprise = enterprises.find(e => e.id === selectedEnterpriseId);
  const isOwnerOrAdmin = selectedEnterprise && session && 
    ((session as any).userId === selectedEnterprise.ownerUserId ||
     userRole === 'owner' || userRole === 'admin' || userRole === 'company_admin');
  
  // Debug logging
  console.log('[Members Page] isOwnerOrAdmin check:', {
    selectedEnterprise: selectedEnterprise?.name,
    currentUserId: (session as any)?.userId,
    enterpriseOwnerId: selectedEnterprise?.ownerUserId,
    userRole,
    isOwnerOrAdmin
  });

  const filteredMembers = members.filter(member => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = member.name?.toLowerCase().includes(query);
      const matchesEmail = member.email?.toLowerCase().includes(query);
      const matchesUsername = member.username?.toLowerCase().includes(query);
      if (!matchesName && !matchesEmail && !matchesUsername) return false;
    }
    
    if (filterRole !== 'all' && member.role !== filterRole) return false;
    if (filterStatus !== 'all' && member.status !== filterStatus) return false;
    
    return true;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-300">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6 w-full overflow-x-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Manage Members</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage all users in one place. Control access, assign roles, and monitor activity across your platform.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors text-sm md:text-base"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="gh-cta-button flex items-center gap-2 px-4 md:px-6 py-2 rounded-lg text-white font-semibold transition-colors text-sm md:text-base"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </button>
            )}
          </div>
        </div>

        <div className="gh-feature-card rounded-lg p-4 md:p-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>
            
            <MobileSelect
              value={filterRole}
              onChange={setFilterRole}
              options={[
                { value: 'all', label: 'Role' },
                ...ROLE_OPTIONS.map(role => ({ value: role.value, label: role.label }))
              ]}
              placeholder="Role"
              label="Filter by Role"
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            />

            <MobileSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: 'all', label: 'Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' }
              ]}
              placeholder="Status"
              label="Filter by Status"
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            />

            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors">
              Date
            </button>
          </div>

          {/* Batch Actions Toolbar */}
          {showBatchActions && (
            <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <span className="text-white font-medium">
                  {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => {
                    setSelectedMembers(new Set());
                    setShowBatchActions(false);
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBatchAddToProject(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                  defaultValue=""
                >
                  <option value="" disabled>Add to Project</option>
                  {companies.map(company => {
                    const companyProjects = projects.filter(p => p.companyId === company.id);
                    if (companyProjects.length === 0) return null;
                    return (
                      <optgroup key={company.id} label={company.name}>
                        {companyProjects.map(project => (
                          <option key={project.id} value={project.id} className="bg-[#1a2332]">
                            {project.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBatchRoleChange(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                  defaultValue=""
                >
                  <option value="" disabled>Change Role</option>
                  {ROLE_OPTIONS.map(role => (
                    <option key={role.value} value={role.value} className="bg-[#1a2332]">
                      {role.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBatchDelete}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-1 text-sm font-semibold text-slate-400 w-8">
                    <input 
                      type="checkbox" 
                      className="rounded border-white/20 bg-white/5 cursor-pointer"
                      checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-slate-400">Name</th>
                  <th className="hidden md:table-cell text-left py-3 px-4 text-sm font-semibold text-slate-400">Email</th>
                  <th className="hidden md:table-cell text-left py-3 px-4 text-sm font-semibold text-slate-400">Status</th>
                  <th className="hidden md:table-cell text-left py-3 px-4 text-sm font-semibold text-slate-400">Role</th>
                  <th className="hidden lg:table-cell text-left py-3 px-4 text-sm font-semibold text-slate-400">Company</th>
                  <th className="hidden lg:table-cell text-left py-3 px-4 text-sm font-semibold text-slate-400">Assigned Project</th>
                  <th className="hidden lg:table-cell text-left py-3 px-4 text-sm font-semibold text-slate-400">Joined Date</th>
                  <th className="text-left py-2 px-1 text-sm font-semibold text-slate-400 w-12">View</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2 px-1">
                      <input 
                        type="checkbox" 
                        className="rounded border-white/20 bg-white/5 cursor-pointer"
                        checked={selectedMembers.has(member.userId)}
                        onChange={() => toggleMemberSelection(member.userId)}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1 min-w-0">
                        <div className="relative group flex-shrink-0">
                          {member.imageUrl ? (
                            <Image
                              src={member.imageUrl}
                              alt={member.name}
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-semibold text-xs">
                              {member.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {isOwnerOrAdmin && (
                            <button
                              onClick={() => {
                                setEditingImage(member.userId);
                                imageInputRef.current?.click();
                              }}
                              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Camera className="w-2 h-2 text-white" />
                            </button>
                          )}
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0] && editingImage) {
                                handleImageUpload(editingImage, e.target.files[0]);
                              }
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-white font-medium text-xs truncate block">{member.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell py-3 px-4 text-slate-300">
                      <div className="truncate">{member.email}</div>
                    </td>
                    <td className="hidden md:table-cell py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(member.status)}`}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </span>
                    </td>
                    <td className="hidden md:table-cell py-3 px-4">
                      {editingRole === member.userId && isOwnerOrAdmin ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                          onBlur={() => setEditingRole(null)}
                          autoFocus
                          className="px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-orange-500"
                        >
                          {ROLE_OPTIONS.map(role => (
                            <option key={role.value} value={role.value} className="bg-[#1a2332]">
                              {role.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => isOwnerOrAdmin && setEditingRole(member.userId)}
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(member.role)} ${isOwnerOrAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                        >
                          {ROLE_OPTIONS.find(r => r.value === member.role)?.label || member.role}
                        </button>
                      )}
                    </td>
                    <td className="hidden lg:table-cell py-3 px-4">
                      {member.assignments && member.assignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(member.assignments.map(a => a.companyName))).slice(0, 2).map((companyName, idx) => (
                            <span 
                              key={idx}
                              className="px-2 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-xs"
                            >
                              {companyName}
                            </span>
                          ))}
                          {Array.from(new Set(member.assignments.map(a => a.companyName))).length > 2 && (
                            <span className="px-2 py-1 bg-slate-500/20 text-slate-300 border border-slate-500/30 rounded text-xs">
                              +{Array.from(new Set(member.assignments.map(a => a.companyName))).length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">None</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell py-3 px-4">
                      {member.assignments && member.assignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {member.assignments.slice(0, 2).map((assignment) => (
                            <span 
                              key={assignment.assignmentId}
                              className="px-2 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded text-xs"
                              title={`${assignment.companyName} - ${assignment.projectName}`}
                            >
                              {assignment.projectName}
                            </span>
                          ))}
                          {member.assignments.length > 2 && (
                            <span className="px-2 py-1 bg-slate-500/20 text-slate-300 border border-slate-500/30 rounded text-xs">
                              +{member.assignments.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">None</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell py-3 px-4 text-slate-300 text-sm">
                      {member.joinedDate || 'N/A'}
                    </td>
                    <td className="py-2 px-1">
                      <div className="flex items-center justify-center">
                        {/* View button - always visible on mobile, hidden on desktop */}
                        <button
                          onClick={() => setViewingMember(member)}
                          className="md:hidden p-0.5 text-slate-400 hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {/* Desktop action buttons */}
                        <div className="hidden md:flex items-center gap-1">
                          {isOwnerOrAdmin && (
                            <button
                              onClick={() => openEditModal(member)}
                              className="p-1 text-slate-400 hover:text-white transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {isOwnerOrAdmin && (
                            <button
                              onClick={async () => {
                                if (confirm(`Remove ${member.name} from this enterprise?`)) {
                                  try {
                                    await fetch(`/api/enterprises/${selectedEnterpriseId}/members/${member.userId}`, {
                                      method: 'DELETE'
                                    });
                                    await loadMembers();
                                  } catch (err) {
                                    console.error('Failed to delete member:', err);
                                    alert('Failed to remove member');
                                  }
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-white/10">
            <div className="text-sm text-slate-400">
              Rows per page: 
              <select className="ml-2 bg-white/5 border border-white/10 rounded px-2 py-1 text-white">
                <option>10</option>
                <option>25</option>
                <option>50</option>
                <option>100</option>
              </select>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <span className="text-sm text-slate-400 whitespace-nowrap">
                1-{Math.min(10, filteredMembers.length)} of {filteredMembers.length}
              </span>
              <div className="flex gap-1 sm:gap-2">
                <button className="p-1 text-slate-400 hover:text-white transition-colors">
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                <button className="px-2 sm:px-3 py-1 bg-white/5 border border-white/10 rounded text-white text-sm">1</button>
                <button className="px-2 sm:px-3 py-1 text-slate-400 hover:text-white transition-colors text-sm">2</button>
                <button className="px-2 sm:px-3 py-1 text-slate-400 hover:text-white transition-colors text-sm">3</button>
                <button className="p-1 text-slate-400 hover:text-white transition-colors">
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-white/10 rounded-lg w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl font-semibold text-white">Invite User</h3>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSendInvite}
                  disabled={!inviteEmail || sendingSingleInvite}
                  className="flex-1 gh-cta-button px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingSingleInvite ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-3 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-white/10 rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#1a2332] z-10">
              <h3 className="text-xl font-semibold text-white">Edit Member</h3>
              <button 
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">User Details</h4>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editModalData.name}
                    onChange={(e) => setEditModalData({ ...editModalData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={editModalData.email}
                    onChange={(e) => setEditModalData({ ...editModalData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Role & Permissions</h4>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Role <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={editModalData.role}
                    onChange={(e) => setEditModalData({ ...editModalData, role: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  >
                    {ROLE_OPTIONS.map(role => (
                      <option key={role.value} value={role.value} className="bg-[#1a2332]">
                        {role.label} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Project Assignments */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Project Assignments</h4>
                  <p className="text-xs text-slate-400 mt-1">Select projects grouped by company. Users will be assigned to both the company and selected projects.</p>
                </div>
                
                <div className="space-y-2">
                  {companies.map(company => {
                    const companyProjects = projects.filter(p => p.companyId === company.id);
                    if (companyProjects.length === 0) return null;
                    
                    return (
                      <div key={company.id} className="border border-white/10 rounded-lg p-4 bg-white/5">
                        <h5 className="text-sm font-medium text-white mb-3">{company.name}</h5>
                        <div className="space-y-2">
                          {companyProjects.map(project => (
                            <label key={project.id} className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={editModalData.selectedProjects.includes(project.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditModalData({
                                      ...editModalData,
                                      selectedProjects: [...editModalData.selectedProjects, project.id]
                                    });
                                  } else {
                                    setEditModalData({
                                      ...editModalData,
                                      selectedProjects: editModalData.selectedProjects.filter(id => id !== project.id)
                                    });
                                  }
                                }}
                                className="rounded border-white/20 bg-white/5 cursor-pointer"
                              />
                              <span className="text-slate-300 group-hover:text-white transition-colors">
                                {project.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {companies.length === 0 && (
                    <p className="text-slate-400 text-sm">No projects available</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 gh-cta-button px-4 py-3 rounded-lg text-white font-semibold"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-3 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Member Modal */}
      {viewingMember && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-white/10 rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#1a2332] z-10">
              <h3 className="text-xl font-semibold text-white">Member Details</h3>
              <button 
                onClick={() => setViewingMember(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Profile */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {viewingMember.imageUrl ? (
                    <Image
                      src={viewingMember.imageUrl}
                      alt={viewingMember.name}
                      width={64}
                      height={64}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-semibold text-xl">
                      {viewingMember.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-white">{viewingMember.name}</h4>
                  <p className="text-slate-300">{viewingMember.email}</p>
                  <p className="text-sm text-slate-400">@{viewingMember.username}</p>
                </div>
              </div>

              {/* Status and Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(viewingMember.status)}`}>
                    {viewingMember.status.charAt(0).toUpperCase() + viewingMember.status.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(viewingMember.role)}`}>
                    {ROLE_OPTIONS.find(r => r.value === viewingMember.role)?.label || viewingMember.role}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Joined Date</label>
                  <p className="text-slate-400">{viewingMember.joinedDate || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Last Active</label>
                  <p className="text-slate-400">{viewingMember.lastActive || 'N/A'}</p>
                </div>
              </div>

              {/* Company Assignments */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Company Assignments</label>
                {viewingMember.assignments && viewingMember.assignments.length > 0 ? (
                  <div className="space-y-3">
                    {Array.from(new Set(viewingMember.assignments.map(a => a.companyName))).map((companyName) => {
                      const companyProjects = viewingMember.assignments?.filter(a => a.companyName === companyName) || [];
                      return (
                        <div key={companyName} className="border border-white/10 rounded-lg p-4 bg-white/5">
                          <h5 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-xs">
                              {companyName}
                            </span>
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {companyProjects.map((assignment) => (
                              <span 
                                key={assignment.assignmentId}
                                className="px-2 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded text-xs"
                              >
                                {assignment.projectName}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No company assignments</p>
                )}
              </div>

              {/* Action Buttons - Only show for owners/admins */}
              {isOwnerOrAdmin && (
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      setViewingMember(null);
                      openEditModal(viewingMember);
                    }}
                    className="flex-1 gh-cta-button px-4 py-3 rounded-lg text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Member
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Remove ${viewingMember.name} from this enterprise?`)) {
                        try {
                          await fetch(`/api/enterprises/${selectedEnterpriseId}/members/${viewingMember.userId}`, {
                            method: 'DELETE'
                          });
                          await loadMembers();
                          setViewingMember(null);
                        } catch (err) {
                          console.error('Failed to delete member:', err);
                          alert('Failed to remove member');
                        }
                      }
                    }}
                    className="px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
