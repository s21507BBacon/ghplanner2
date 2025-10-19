'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Search, Users, Edit2, Trash2, Camera, 
  TrendingUp, BarChart3, X
} from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import Image from 'next/image';

interface Member {
  userId: string;
  assignmentId: string;
  name: string;
  email: string;
  username: string;
  imageUrl?: string;
  role: string;
  status: string;
  activity?: {
    tasksCreated: number;
    tasksAssigned: number;
    tasksCompleted: number;
    commentsCount: number;
    taskUpdates: number;
    activityScore: number;
    lastActivityDate: string | null;
  };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  members: Member[];
}

interface Company {
  id: string;
  name: string;
  description?: string;
  enterpriseId: string;
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

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'activity' | 'recent'>('name');
  
  // Edit modal state
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editModalData, setEditModalData] = useState<{
    name: string;
    email: string;
    role: string;
  }>({ name: '', email: '', role: '' });
  
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const companyId = params?.companyId as string;

  const loadCompanyData = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      
      // Fetch company and projects
      const companyRes = await fetch(`/api/companies/${companyId}`);
      if (companyRes.ok) {
        const data = await companyRes.json();
        setCompany(data.company);
        setProjects(data.projects);
      }

      // Fetch member activity for ranking
      const activityRes = await fetch(`/api/companies/${companyId}/members/activity`);
      if (activityRes.ok) {
        const activityData = await activityRes.json() as { members: Array<{ userId: string; activity: unknown }> };
        
        // Merge activity data with project members
        setProjects(prevProjects => 
          prevProjects.map(project => ({
            ...project,
            members: project.members.map(member => {
              const activityMember = activityData.members.find(
                (am) => am.userId === member.userId
              );
              return {
                ...member,
                activity: activityMember?.activity as any
              };
            })
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load company data:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      loadCompanyData();
    }
  }, [companyId, loadCompanyData]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!company) return;
    
    try {
      const res = await fetch(
        `/api/enterprises/${company.enterpriseId}/members/${userId}/role`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (res.ok) {
        await loadCompanyData();
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleImageUpload = async (userId: string, file: File) => {
    if (!company) return;
    
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(
        `/api/enterprises/${company.enterpriseId}/members/${userId}/image`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (res.ok) {
        await loadCompanyData();
        setEditingImage(null);
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
    }
  };

  const handleRemoveMember = async (assignmentId: string, memberName: string) => {
    if (!company) return;
    
    if (!confirm(`Remove ${memberName} from this project?`)) return;

    try {
      const res = await fetch(
        `/api/enterprises/${company.enterpriseId}/members?assignmentId=${assignmentId}`,
        {
          method: 'DELETE'
        }
      );
      
      if (res.ok) {
        await loadCompanyData();
      } else {
        alert('Failed to remove member');
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert('Failed to remove member');
    }
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setEditModalData({
      name: member.name,
      email: member.email,
      role: member.role
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMember || !company) return;

    try {
      // Update name and email
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

      // Update role
      if (editModalData.role !== editingMember.role) {
        await handleRoleChange(editingMember.userId, editModalData.role);
      }

      await loadCompanyData();
      setEditingMember(null);
    } catch (err) {
      console.error('Failed to save member edits:', err);
      alert('Failed to save changes');
    }
  };

  const getSortedMembers = (members: Member[]) => {
    let sorted = [...members];
    
    if (sortBy === 'activity') {
      sorted.sort((a, b) => {
        const scoreA = a.activity?.activityScore || 0;
        const scoreB = b.activity?.activityScore || 0;
        return scoreB - scoreA;
      });
    } else if (sortBy === 'recent') {
      sorted.sort((a, b) => {
        const dateA = a.activity?.lastActivityDate ? new Date(a.activity.lastActivityDate).getTime() : 0;
        const dateB = b.activity?.lastActivityDate ? new Date(b.activity.lastActivityDate).getTime() : 0;
        return dateB - dateA;
      });
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      sorted = sorted.filter(member =>
        member.name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.username?.toLowerCase().includes(query)
      );
    }

    return sorted;
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

return (
  <AdminLayout>
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href={`/companies`}
            className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Companies
          </Link>
          <h1 className="text-3xl font-bold text-white">{company.name}</h1>
          {company.description && (
            <p className="text-slate-400 text-sm mt-1">{company.description}</p>
          )}
        </div>
        <Link
          href={`/companies/${companyId}/statistics`}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          Company Statistics
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
          />
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'activity' | 'recent')}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
        >
          <option value="name" className="bg-[#1a2332]">Sort by Name</option>
          <option value="activity" className="bg-[#1a2332]">Sort by Activity Score</option>
          <option value="recent" className="bg-[#1a2332]">Sort by Recent Activity</option>
        </select>
      </div>

        {/* Projects Grid */}
        <div className="grid gap-6">
          {projects.map((project) => {
            const sortedMembers = getSortedMembers(project.members);
            
            return (
              <div key={project.id} className="gh-feature-card rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-white">{project.name}</h2>
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-slate-300 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {project.members.length}
                    </span>
                  </div>
                  <button
                    onClick={() => router.push(`/companies/${companyId}/projects/${project.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    View Statistics
                  </button>
                </div>

                {sortedMembers.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No members found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Member</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Email</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Role</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Status</th>
                          {sortBy === 'activity' && (
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">
                              <TrendingUp className="w-4 h-4 inline mr-1" />
                              Score
                            </th>
                          )}
                          {sortBy === 'recent' && (
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Last Active</th>
                          )}
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedMembers.map((member, index) => (
                          <tr key={member.userId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {sortBy === 'activity' && (
                                  <span className="text-slate-400 font-mono text-sm w-6">
                                    #{index + 1}
                                  </span>
                                )}
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
                                  <button
                                    onClick={() => {
                                      setEditingImage(member.userId);
                                      imageInputRef.current?.click();
                                    }}
                                    className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Camera className="w-4 h-4 text-white" />
                                  </button>
                                </div>
                                <span className="text-white font-medium">{member.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-300">{member.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(member.role)}`}>
                                {ROLE_OPTIONS.find(r => r.value === member.role)?.label || member.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(member.status)}`}>
                                {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                              </span>
                            </td>
                            {sortBy === 'activity' && (
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-orange-400 font-bold">
                                    {member.activity?.activityScore || 0}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    ({member.activity?.tasksCompleted || 0} tasks, {member.activity?.commentsCount || 0} comments)
                                  </span>
                                </div>
                              </td>
                            )}
                            {sortBy === 'recent' && (
                              <td className="py-3 px-4 text-slate-300 text-sm">
                                {member.activity?.lastActivityDate 
                                  ? new Date(member.activity.lastActivityDate).toLocaleDateString()
                                  : 'Never'}
                              </td>
                            )}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEditModal(member)}
                                  className="p-1 text-slate-400 hover:text-white transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(member.assignmentId, member.name)}
                                  className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                                  title="Remove from project"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div className="gh-feature-card rounded-lg p-12 text-center">
            <p className="text-slate-400">No projects found in this company</p>
          </div>
        )}
      </div>

      {/* Hidden file input for image uploads */}
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

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-white/10 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Edit Member</h3>
              <button
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editModalData.name}
                  onChange={(e) => setEditModalData({ ...editModalData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editModalData.email}
                  onChange={(e) => setEditModalData({ ...editModalData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={editModalData.role}
                  onChange={(e) => setEditModalData({ ...editModalData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role.value} value={role.value} className="bg-[#1a2332]">
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 gh-cta-button px-4 py-2 rounded-lg text-white font-semibold"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingMember(null)}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
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
