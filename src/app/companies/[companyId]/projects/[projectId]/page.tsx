'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, CheckCircle2, GitMerge, MessageSquare, 
  TrendingUp, Users, Calendar, Activity, Award
} from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import Image from 'next/image';

interface ProjectStats {
  project: {
    id: string;
    name: string;
    description?: string;
  };
  statistics: {
    tasks: {
      total: number;
      completed: number;
      inProgress: number;
      todo: number;
      completionRate: number;
    };
    merges: {
      total: number;
      totalBranches: number;
    };
    comments: {
      total: number;
      byUser: Record<string, number>;
      timeline: Array<{ date: string; count: number }>;
    };
    timeline: Array<{ date: string; created: number; completed: number }>;
    topContributors: Array<{
      userId: string;
      name: string;
      imageUrl?: string;
      tasks: number;
      comments: number;
      score: number;
    }>;
  };
}

export default function ProjectStatisticsPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);

  const companyId = params?.companyId as string;
  const projectId = params?.projectId as string;

  useEffect(() => {
    if (companyId && projectId) {
      loadStatistics();
    }
  }, [companyId, projectId]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/projects/${projectId}/statistics`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-300">Loading statistics...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-300">Statistics not available</div>
        </div>
      </AdminLayout>
    );
  }

  const { project, statistics } = stats;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <Link 
            href={`/companies/${companyId}`}
            className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Company
          </Link>
          <h1 className="text-3xl font-bold text-white">{project.name} - Statistics</h1>
          {project.description && (
            <p className="text-slate-400 text-sm mt-1">{project.description}</p>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="gh-feature-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-white">{statistics.tasks.completed}</span>
            </div>
            <h3 className="text-slate-400 text-sm">Completed Tasks</h3>
            <p className="text-xs text-slate-500 mt-1">
              {statistics.tasks.completionRate}% completion rate
            </p>
          </div>

          <div className="gh-feature-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">{statistics.tasks.total}</span>
            </div>
            <h3 className="text-slate-400 text-sm">Total Tasks</h3>
            <p className="text-xs text-slate-500 mt-1">
              {statistics.tasks.inProgress} in progress, {statistics.tasks.todo} to do
            </p>
          </div>

          <div className="gh-feature-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <GitMerge className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">{statistics.merges.total}</span>
            </div>
            <h3 className="text-slate-400 text-sm">Merged Branches</h3>
            <p className="text-xs text-slate-500 mt-1">
              {statistics.merges.totalBranches} total branches
            </p>
          </div>

          <div className="gh-feature-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-8 h-8 text-orange-400" />
              <span className="text-2xl font-bold text-white">{statistics.comments.total}</span>
            </div>
            <h3 className="text-slate-400 text-sm">Comments</h3>
            <p className="text-xs text-slate-500 mt-1">
              Total discussion activity
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Task Status Distribution */}
          <div className="gh-feature-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Task Status Distribution
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300">Completed</span>
                  <span className="text-green-400 font-semibold">{statistics.tasks.completed}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${statistics.tasks.total > 0 ? (statistics.tasks.completed / statistics.tasks.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300">In Progress</span>
                  <span className="text-blue-400 font-semibold">{statistics.tasks.inProgress}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all"
                    style={{ width: `${statistics.tasks.total > 0 ? (statistics.tasks.inProgress / statistics.tasks.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300">To Do</span>
                  <span className="text-slate-400 font-semibold">{statistics.tasks.todo}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3">
                  <div 
                    className="bg-slate-500 h-3 rounded-full transition-all"
                    style={{ width: `${statistics.tasks.total > 0 ? (statistics.tasks.todo / statistics.tasks.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Completion Rate Gauge */}
          <div className="gh-feature-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Overall Progress
            </h2>
            <div className="flex items-center justify-center h-48">
              <div className="relative w-48 h-48">
                <svg className="transform -rotate-90 w-48 h-48">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={`${2 * Math.PI * 80 * (1 - statistics.tasks.completionRate / 100)}`}
                    className="text-orange-500 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-4xl font-bold text-white">{statistics.tasks.completionRate}%</span>
                  <span className="text-slate-400 text-sm">Complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Task Timeline */}
        {statistics.timeline.length > 0 && (
          <div className="gh-feature-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Task Activity Timeline
            </h2>
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-4">
                {statistics.timeline.slice(-30).map((day, index) => {
                  const maxValue = Math.max(...statistics.timeline.map(d => Math.max(d.created, d.completed)));
                  const createdHeight = maxValue > 0 ? (day.created / maxValue) * 100 : 0;
                  const completedHeight = maxValue > 0 ? (day.completed / maxValue) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <div className="flex items-end gap-1 h-32">
                        <div 
                          className="w-4 bg-blue-500/50 rounded-t"
                          style={{ height: `${createdHeight}%` }}
                          title={`${day.created} created`}
                        />
                        <div 
                          className="w-4 bg-green-500/50 rounded-t"
                          style={{ height: `${completedHeight}%` }}
                          title={`${day.completed} completed`}
                        />
                      </div>
                      <span className="text-xs text-slate-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500/50 rounded" />
                  <span className="text-sm text-slate-400">Created</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500/50 rounded" />
                  <span className="text-sm text-slate-400">Completed</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comment Activity */}
        {statistics.comments.timeline.length > 0 && (
          <div className="gh-feature-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comment Activity
            </h2>
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-4">
                {statistics.comments.timeline.slice(-30).map((day, index) => {
                  const maxComments = Math.max(...statistics.comments.timeline.map(d => d.count));
                  const height = maxComments > 0 ? (day.count / maxComments) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <div className="flex items-end h-32">
                        <div 
                          className="w-6 bg-orange-500/50 rounded-t"
                          style={{ height: `${height}%` }}
                          title={`${day.count} comments`}
                        />
                      </div>
                      <span className="text-xs text-slate-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Top Contributors */}
        {statistics.topContributors.length > 0 && (
          <div className="gh-feature-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Top Contributors
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statistics.topContributors.map((contributor, index) => (
                <div 
                  key={contributor.userId}
                  className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg hover:border-orange-500/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="relative">
                      {contributor.imageUrl ? (
                        <Image
                          src={contributor.imageUrl}
                          alt={contributor.name}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-semibold text-lg">
                          {contributor.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {index < 3 && (
                        <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500 text-yellow-900' :
                          index === 1 ? 'bg-slate-400 text-slate-900' :
                          'bg-orange-600 text-orange-100'
                        }`}>
                          {index + 1}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{contributor.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{contributor.tasks} tasks</span>
                      <span>•</span>
                      <span>{contributor.comments} comments</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-orange-400 font-bold text-sm">
                        Score: {contributor.score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {statistics.tasks.total === 0 && (
          <div className="gh-feature-card rounded-lg p-12 text-center">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No activity data available yet</p>
            <p className="text-slate-500 text-sm mt-2">Start creating tasks to see statistics</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
