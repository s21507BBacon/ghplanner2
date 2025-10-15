'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  UserPlus, X, ArrowLeft, Search, Mail, Upload, Download, 
  Edit2, Trash2, Camera, ChevronDown 
} from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import Image from 'next/image';

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
      }
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/enterprises/${selectedEnterpriseId}/members/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        await loadMembers();
        setEditingRole(null);
      }
    } catch (err) {
      console.error('Failed to update role:', err);
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
      ['Full Name', 'Email', 'Username', 'Role', 'Status', 'Projects', 'Joined Date', 'Last Active'],
      ...filteredMembers.map(member => [
        member.name,
        member.email,
        member.username,
        member.role,
        member.status,
        member.assignments?.map(a => `${a.companyName} - ${a.projectName}`).join('; ') || 'None',
        member.joinedDate || 'N/A',
        member.lastActive || 'N/A'
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

  const selectedEnterprise = enterprises.find(e => e.id === selectedEnterpriseId);
  const isOwnerOrAdmin = selectedEnterprise && session && 
    ((session as any).userId === selectedEnterprise.ownerUserId);

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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white">Manage Members</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage all users in one place. Control access, assign roles, and monitor activity across your platform.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="gh-cta-button flex items-center gap-2 px-6 py-2 rounded-lg text-white font-semibold transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </button>
            )}
          </div>
        </div>

        <div className="gh-feature-card rounded-lg p-6">
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
            
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            >
              <option value="all" className="bg-[#1a2332]">Role</option>
              {ROLE_OPTIONS.map(role => (
                <option key={role.value} value={role.value} className="bg-[#1a2332]">{role.label}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            >
              <option value="all" className="bg-[#1a2332]">Status</option>
              <option value="active" className="bg-[#1a2332]">Active</option>
              <option value="inactive" className="bg-[#1a2332]">Inactive</option>
              <option value="pending" className="bg-[#1a2332]">Pending</option>
            </select>

            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors">
              Date
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">
                    <input type="checkbox" className="rounded border-white/20 bg-white/5" />
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Full Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Username</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Joined Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Last Active</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <input type="checkbox" className="rounded border-white/20 bg-white/5" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative group">
                          {member.imageUrl ? (
                            <Image
                              src={member.imageUrl}
                              alt={member.name}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
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
                              <Camera className="w-4 h-4 text-white" />
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
                        <span className="text-white font-medium">{member.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{member.email}</td>
                    <td className="py-3 px-4 text-slate-300">{member.username || member.userId.slice(0, 8)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(member.status)}`}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 text-slate-300 text-sm">
                      {member.joinedDate || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-sm">
                      {member.lastActive || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1 text-slate-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isOwnerOrAdmin && (
                          <button
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
            <div className="text-sm text-slate-400">
              Rows per page: 
              <select className="ml-2 bg-white/5 border border-white/10 rounded px-2 py-1 text-white">
                <option>10</option>
                <option>25</option>
                <option>50</option>
                <option>100</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">
                1-{Math.min(10, filteredMembers.length)} of {filteredMembers.length} rows
              </span>
              <div className="flex gap-2">
                <button className="p-1 text-slate-400 hover:text-white transition-colors">
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                <button className="px-3 py-1 bg-white/5 border border-white/10 rounded text-white">1</button>
                <button className="px-3 py-1 text-slate-400 hover:text-white transition-colors">2</button>
                <button className="px-3 py-1 text-slate-400 hover:text-white transition-colors">3</button>
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
    </AdminLayout>
  );
}
