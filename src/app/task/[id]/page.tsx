'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  GitCommit,
  FileText,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
  Send,
  Calendar,
  User,
  Tag,
  AlertCircle,
  Trash2,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { Task, STATUS_COLORS, Column, getColumnColorClasses } from '@/lib/types';

interface PRData {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  mergeable_state: string;
  author: {
    login: string;
    avatar_url: string;
  };
  branch: {
    head: string;
    base: string;
    head_sha: string;
    base_sha: string;
  };
  dates: {
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
  };
  stats: {
    commits: number;
    additions: number;
    deletions: number;
    changed_files: number;
  };
  reviews: {
    summary: Record<string, any>;
    all: any[];
  };
  files: Array<{
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed';
    additions: number;
    deletions: number;
    changes: number;
    blob_url: string;
  }>;
  ci: {
    combined_status: {
      state: 'pending' | 'success' | 'failure' | 'error';
      total_count: number;
      statuses: any[];
    };
    check_runs: Array<{
      id: number;
      name: string;
      status: 'queued' | 'in_progress' | 'completed';
      conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
      html_url: string;
      details_url?: string;
    }>;
  };
  html_url: string;
}

interface Comment {
  id: string;
  author: string;
  authorId?: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

function StatusBadge({ state, className = '' }: { state: string; className?: string }) {
  const getStateStyles = (state: string) => {
    switch (state.toLowerCase()) {
      case 'success':
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failure':
      case 'error':
      case 'changes_requested':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending':
      case 'in_progress':
      case 'queued':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'neutral':
      case 'cancelled':
      case 'skipped':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'merged':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'draft':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStateStyles(state)} ${className}`}>
      {state}
    </span>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-white/10 rounded ${className}`} />;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const { data: session } = useSession();

  const [task, setTask] = useState<Task | null>(null);
  const [column, setColumn] = useState<Column | null>(null);
  const [prData, setPrData] = useState<PRData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [taskLoading, setTaskLoading] = useState(true);
  const [prLoading, setPrLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigneeUsers, setAssigneeUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [canComment, setCanComment] = useState(false);

  // Comment form state
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (taskId) {
      fetchTask();
      fetchComments();
    }
  }, [taskId]);

  useEffect(() => {
    if (session?.user && task) {
      checkCommentPermission();
    }
  }, [session, task]);

  useEffect(() => {
    if (task?.prUrl) {
      fetchPRData();
    }
    if (task?.columnId) {
      fetchColumn();
    }
    if (task?.projectId && (task as any)?.assignees?.length > 0) {
      fetchAssigneeUsers();
    }
  }, [task]);

  const fetchAssigneeUsers = async () => {
    if (!(task as any)?.projectId) return;
    
    try {
      const response = await fetch(`/api/projects/${(task as any).projectId}/users`);
      if (response.ok) {
        const data = await response.json();
        const taskAssignees = (task as any).assignees || [];
        const filteredUsers = data.users.filter((u: any) => taskAssignees.includes(u.id));
        setAssigneeUsers(filteredUsers);
      }
    } catch (err) {
      console.error('Failed to fetch assignee users:', err);
    }
  };

  const fetchTask = async () => {
    setTaskLoading(true);
    try {
      const response = await fetch(`/api/planner/tasks/${taskId}`);
      if (!response.ok) {
        throw new Error('Task not found');
      }
      const data = await response.json();
      setTask(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task');
    } finally {
      setTaskLoading(false);
    }
  };

  const fetchColumn = async () => {
    if (!task?.columnId || !task?.boardId) return;

    try {
      const response = await fetch(`/api/planner/columns?boardId=${task.boardId}`);
      const data = await response.json();
      const foundColumn = data.columns?.find((col: Column) => col.id === task.columnId);
      setColumn(foundColumn || null);
    } catch (err) {
      console.error('Failed to fetch column:', err);
    }
  };

  const fetchPRData = async () => {
    if (!task?.prUrl) return;

    setPrLoading(true);
    try {
      const params = new URLSearchParams({
        url: task.prUrl,
      });

      if ((task as any).enterpriseId) {
        params.set('enterpriseId', (task as any).enterpriseId);
      }
      if ((task as any).projectId) {
        params.set('projectId', (task as any).projectId);
      }

      const response = await fetch(`/api/github/pr?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.hint ? `${data.error}: ${data.hint}` : data.error);
      }

      setPrData(data);
    } catch (err) {
      console.error('Failed to fetch PR data:', err);
      // Don't set error state for PR fetch failures, just log them
    } finally {
      setPrLoading(false);
    }
  };

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const response = await fetch(`/api/planner/tasks/comments?taskId=${taskId}`);
      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskId) return;
    if (!confirm('Delete this task permanently?')) return;
    try {
      const res = await fetch(`/api/planner/tasks?id=${taskId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      router.push('/planner');
    } catch (e) {
      console.error('Failed to delete task:', e);
      alert('Failed to delete task. Please try again.');
    }
  };

  const checkCommentPermission = async () => {
    if (!session?.user?.email || !task) {
      setCanComment(false);
      return;
    }

    try {
      // Check if user is allocated to the project or is admin/enterprise creator
      const response = await fetch(`/api/planner/tasks/${taskId}/can-comment`);
      const data = await response.json();
      setCanComment(data.canComment || false);
    } catch (err) {
      console.error('Failed to check comment permission:', err);
      setCanComment(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !session?.user?.name) return;

    setSubmittingComment(true);
    try {
      let imageUrl: string | undefined;

      // Upload image if selected
      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        formData.append('taskId', taskId);

        const uploadResponse = await fetch('/api/planner/tasks/comments/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          imageUrl = uploadData.imageUrl;
        }
      }

      const response = await fetch('/api/planner/tasks/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          author: session.user.name,
          authorId: (session.user as any).id,
          content: newComment.trim(),
          imageUrl,
        }),
      });

      if (response.ok) {
        const newCommentData = await response.json();
        setComments(prev => [...prev, newCommentData]);
        setNewComment('');
        removeImage();
        
        // Show GitHub sync status
        if (newCommentData.githubSync) {
          if (newCommentData.githubSync.success) {
            console.log('Comment synced to GitHub PR successfully');
          } else if (newCommentData.githubSync.error === 'GitHub account not connected') {
            // Optionally show a notification to connect GitHub
            console.log('GitHub account not connected - comment not synced to PR');
          } else {
            console.warn('Failed to sync comment to GitHub:', newCommentData.githubSync.error);
          }
        }
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
      alert('Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatusIcon = (status: string, conclusion?: string | null) => {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success':
          return <CheckCircle className="w-4 h-4 text-green-400" />;
        case 'failure':
        case 'error':
          return <XCircle className="w-4 h-4 text-red-400" />;
        case 'neutral':
        case 'cancelled':
        case 'skipped':
          return <AlertCircle className="w-4 h-4 text-slate-400" />;
        default:
          return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      }
    } else {
      return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  if (taskLoading) {
    return (
      <div className="min-h-screen gh-hero-gradient">
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-6">
            <Skeleton className="h-10 w-32 mb-4" />
            <Skeleton className="h-8 w-96" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen gh-hero-gradient">
        <div className="max-w-6xl mx-auto p-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-300 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-medium text-white mb-2">
              {error || 'Task not found'}
            </h2>
          </div>
        </div>
      </div>
    );
  }

  const columnColors = column ? getColumnColorClasses(column.color) : getColumnColorClasses('slate');

  return (
    <div className="min-h-screen gh-hero-gradient">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Planner
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-3">{task.title}</h1>
              <div className="flex items-center gap-3 flex-wrap mb-4">
                <TaskStatusBadge status={task.status} />
                {column && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getColumnColorClasses(column.color).bg} ${getColumnColorClasses(column.color).text} ${getColumnColorClasses(column.color).border}`}>
                    {column.name}
                  </span>
                )}
                {task.labels?.map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  >
                    {label}
                  </span>
                ))}
              </div>
              {task.description && (
                <p className="text-slate-300 mb-4">{task.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-slate-300">
                {assigneeUsers.length > 0 && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span className="font-mono">
                      {assigneeUsers.map(u => u.name).join(', ')}
                    </span>
                  </div>
                )}
                {(task as any).createdBy && (
                  <div className="flex items-center gap-1" title="Task creator">
                    <User className="w-4 h-4 text-orange-400" />
                    <span>Created by <span className="font-mono">{(task as any).createdBy.name}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleDeleteTask}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Task Details Section */}
        <div className="gh-feature-card rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${columnColors.bg}`}></div>
            <h2 className="text-xl font-semibold text-white">Task Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Status</label>
              <TaskStatusBadge status={task.status} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Column</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${columnColors.bg} ${columnColors.text} ${columnColors.border}`}>
                {column?.name || 'Unknown'}
              </span>
            </div>
            {assigneeUsers.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Assignees</label>
                <div className="flex flex-wrap gap-2">
                  {assigneeUsers.map(user => (
                    <div key={user.id} className="flex items-center gap-1 text-sm bg-white/10 px-2 py-1 rounded border border-white/10">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="font-mono text-white">{user.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(task as any).createdBy && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Created By</label>
                <div className="flex items-center gap-1 text-sm bg-white/10 px-2 py-1 rounded border border-white/10 w-fit">
                  <User className="w-3 h-3 text-orange-400" />
                  <span className="font-mono text-white">{(task as any).createdBy.name}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Created</label>
              <div className="flex items-center gap-1 text-sm text-slate-300">
                <Calendar className="w-4 h-4" />
                <span>{new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {task.labels && task.labels.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-2">Labels</label>
              <div className="flex flex-wrap gap-2">
                {task.labels.map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {task.description && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Description</label>
              <p className="text-slate-300 leading-relaxed">{task.description}</p>
            </div>
          )}

          {task.checklist && task.checklist.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-400 mb-3">Checklist</label>
              <div className="space-y-2">
                {task.checklist.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {item.completed ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <div className="w-4 h-4 border border-white/30 rounded"></div>
                    )}
                    <span className={`text-sm ${item.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                      {item.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* GitHub PR Information Section */}
        <div className="space-y-6 mb-6">
            {task.prUrl ? (
              prLoading ? (
                <div className="gh-feature-card rounded-lg p-6">
                  <Skeleton className="h-6 w-48 mb-4" />
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <div className="grid grid-cols-2 gap-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                </div>
              ) : prData ? (
                <>
                  {/* PR Header */}
                  <div className="gh-feature-card rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <GitBranch className="w-5 h-5 text-orange-400" />
                      <h3 className="text-xl font-semibold text-white">GitHub Pull Request</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-white mb-2">
                          #{prData.number}: {prData.title}
                        </h4>
                        <div className="flex items-center gap-2 mb-3">
                          <StatusBadge state={prData.state} />
                          {prData.draft && <StatusBadge state="draft" />}
                          {prData.merged && <StatusBadge state="merged" />}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-300">
                          <div className="flex items-center gap-1">
                            <GitBranch className="w-4 h-4" />
                            <span className="font-mono">{prData.branch.head}</span>
                            <span>→</span>
                            <span className="font-mono">{prData.branch.base}</span>
                          </div>
                          <a
                            href={prData.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View on GitHub
                          </a>
                        </div>
                      </div>

                      {/* PR Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-white/5 border border-white/10 rounded-lg">
                          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                            <GitCommit className="w-4 h-4" />
                          </div>
                          <div className="font-semibold text-white text-lg">{prData.stats.commits}</div>
                          <div className="text-xs text-slate-400">Commits</div>
                        </div>
                        <div className="text-center p-3 bg-white/5 border border-white/10 rounded-lg">
                          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="font-semibold text-white text-lg">{prData.stats.changed_files}</div>
                          <div className="text-xs text-slate-400">Files</div>
                        </div>
                        <div className="text-center p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                            <Plus className="w-4 h-4" />
                          </div>
                          <div className="font-semibold text-green-400 text-lg">+{prData.stats.additions}</div>
                          <div className="text-xs text-green-300">Added</div>
                        </div>
                        <div className="text-center p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
                            <Minus className="w-4 h-4" />
                          </div>
                          <div className="font-semibold text-red-400 text-lg">-{prData.stats.deletions}</div>
                          <div className="text-xs text-red-300">Deleted</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CI Status */}
                  {(prData.ci.combined_status.statuses.length > 0 || prData.ci.check_runs.length > 0) && (
                    <div className="gh-feature-card rounded-lg p-6">
                      <h4 className="font-medium text-white text-xl mb-4">CI Status & Checks</h4>

                      {prData.ci.combined_status.statuses.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-slate-300 mb-2">Status Checks</h5>
                          <div className="space-y-2">
                            {prData.ci.combined_status.statuses.map((status, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded text-sm">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon('completed', status.state)}
                                  <span className="font-medium text-white">{status.context}</span>
                                </div>
                                <StatusBadge state={status.state} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {prData.ci.check_runs.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-slate-300 mb-2">Check Runs</h5>
                          <div className="space-y-2">
                            {prData.ci.check_runs.map((check) => (
                              <div key={check.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded text-sm">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(check.status, check.conclusion)}
                                  <span className="font-medium text-white">{check.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <StatusBadge state={check.conclusion || check.status} />
                                  <a
                                    href={check.details_url || check.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    Details
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Changed Files */}
                  {prData.files.length > 0 && (
                    <div className="gh-feature-card rounded-lg p-6">
                      <h4 className="font-medium text-white text-xl mb-4">
                        Changed Files ({prData.files.length})
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {prData.files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded text-sm hover:border-orange-500/50 transition-colors">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <StatusBadge state={file.status} />
                              <span className="font-mono text-xs truncate text-slate-300">{file.filename}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {file.additions > 0 && (
                                <span className="text-green-400 font-medium">+{file.additions}</span>
                              )}
                              {file.deletions > 0 && (
                                <span className="text-red-400 font-medium">-{file.deletions}</span>
                              )}
                              <a
                                href={file.blob_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                View
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="gh-feature-card rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    <h3 className="text-xl font-semibold text-white">GitHub Pull Request</h3>
                  </div>
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-orange-400" />
                    <p className="mb-2 text-slate-300">Unable to load PR information</p>
                    <p className="text-sm text-slate-400">The PR may be private or the URL may be invalid</p>
                    <a
                      href={task.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on GitHub
                    </a>
                  </div>
                </div>
              )
            ) : (
              <div className="gh-feature-card rounded-lg p-6">
                <div className="text-center py-8">
                  <GitBranch className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-300">No GitHub PR linked</p>
                  <p className="text-sm text-slate-400">Edit the task to add a GitHub PR URL</p>
                </div>
              </div>
            )}
        </div>

        {/* Discussion Section */}
        <div className="gh-feature-card rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-semibold text-white">
              Discussion ({comments.length})
            </h2>
          </div>

          {/* Comment Form */}
          {!session?.user ? (
            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg text-center">
              <p className="text-slate-300 text-sm">Please sign in to comment</p>
            </div>
          ) : !canComment ? (
            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg text-center">
              <p className="text-slate-300 text-sm">You must be allocated to this project to comment</p>
            </div>
          ) : (
            <form onSubmit={submitComment} className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">Commenting as <span className="font-semibold text-white">{session.user.name}</span></span>
                </div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-sm"
                  required
                />
                
                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="max-w-xs max-h-48 rounded-lg border border-white/10" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-colors">
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">Add Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="gh-cta-button flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Send className="w-4 h-4" />
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {commentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p className="text-slate-300">No comments yet</p>
                <p className="text-sm text-slate-400">Be the first to add a comment!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-orange-500/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white text-sm">{comment.author}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                  {comment.imageUrl && (
                    <div className="mt-3">
                      <img 
                        src={comment.imageUrl} 
                        alt="Comment attachment" 
                        className="max-w-md max-h-96 rounded-lg border border-white/10 cursor-pointer hover:border-orange-500/50 transition-colors"
                        onClick={() => window.open(comment.imageUrl, '_blank')}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
