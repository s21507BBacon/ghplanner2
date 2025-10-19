'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CheckCircle2, MessageSquare, TrendingUp, Activity, GitMerge, BarChart3, Award } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import Image from 'next/image';

interface CompanyStats {
  company: { id: string; name: string; enterpriseId: string };
  statistics: {
    tasks: { total: number; completed: number; inProgress: number; todo: number; completionRate: number };
    merges: { total: number; totalBranches: number };
    comments: { total: number; byUser: Record<string, number>; timeline: Array<{ date: string; count: number }> };
    timeline: Array<{ date: string; created: number; completed: number }>;
    topContributors: Array<{ userId: string; name: string; imageUrl?: string; tasks: number; comments: number; score: number }>;
    byProject: Array<{ id: string; name: string; total: number; completed: number; inProgress: number; todo: number; completionRate: number }>;
  };
}

export default function CompanyStatisticsPage() {
  const params = useParams();
  const { status } = useSession();
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const companyId = params?.companyId as string;

  useEffect(() => {
    if (status === 'unauthenticated') return;
    if (companyId) loadStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, status]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/statistics`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load company statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-300">Loading company statistics...</div>
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

  const { company, statistics } = stats;

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
          <h1 className="text-3xl font-bold text-white">{company.name} — Company Statistics</h1>
          <p className="text-slate-400 text-sm mt-1">Overview of planner activity across all projects in this company.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="gh-feature-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-white">{statistics.tasks.completed}</span>
            </div>
            <h3 className="text-slate-400 text-sm">Completed Tasks</h3>
            <p className="text-xs text-slate-500 mt-1">{statistics.tasks.completionRate}% completion rate</p>
          </div>

          <div className="gh-feature-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">{statistics.tasks.total}</span>
            </div>
            <h3 className="text-slate-400 text-sm">Total Tasks</h3>
            <p className="text-xs text-slate-500 mt-1">{statistics.tasks.inProgress} in progress, {statistics.tasks.todo} to do</p>
          </div>

          <div className="gh-feature-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <GitMerge className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">{statistics.merges.total}</span>
            </div>
            <h3 className="text-slate-400 text-sm">Merged Branches</h3>
            <p className="text-xs text-slate-500 mt-1">{statistics.merges.totalBranches} total branches</p>
          </div>

          <div className="gh-feature-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-8 h-8 text-orange-400" />
              <span className="text-2xl font-bold text-white">{statistics.comments.total}</span>
            </div>
            <h3 className="text-slate-400 text-sm">Comments</h3>
            <p className="text-xs text-slate-500 mt-1">Discussion activity across projects</p>
          </div>
        </div>

        {/* Progress Gauge + Status Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Completion Gauge */}
          <div className="gh-feature-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Overall Progress
            </h2>
            <div className="flex items-center justify-center h-48">
              <div className="relative w-48 h-48">
                <svg className="transform -rotate-90 w-48 h-48">
                  <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/10" />
                  <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={`${2 * Math.PI * 80}`} strokeDashoffset={`${2 * Math.PI * 80 * (1 - statistics.tasks.completionRate / 100)}`} className="text-orange-500 transition-all duration-1000" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-4xl font-bold text-white">{statistics.tasks.completionRate}%</span>
                  <span className="text-slate-400 text-sm">Complete</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="gh-feature-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Task Status Distribution
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2"><span className="text-slate-300">Completed</span><span className="text-green-400 font-semibold">{statistics.tasks.completed}</span></div>
                <div className="w-full bg-white/5 rounded-full h-3"><div className="bg-green-500 h-3 rounded-full" style={{ width: `${statistics.tasks.total > 0 ? (statistics.tasks.completed / statistics.tasks.total) * 100 : 0}%` }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><span className="text-slate-300">In Progress</span><span className="text-blue-400 font-semibold">{statistics.tasks.inProgress}</span></div>
                <div className="w-full bg-white/5 rounded-full h-3"><div className="bg-blue-500 h-3 rounded-full" style={{ width: `${statistics.tasks.total > 0 ? (statistics.tasks.inProgress / statistics.tasks.total) * 100 : 0}%` }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><span className="text-slate-300">To Do</span><span className="text-slate-400 font-semibold">{statistics.tasks.todo}</span></div>
                <div className="w-full bg-white/5 rounded-full h-3"><div className="bg-slate-500 h-3 rounded-full" style={{ width: `${statistics.tasks.total > 0 ? (statistics.tasks.todo / statistics.tasks.total) * 100 : 0}%` }} /></div>
              </div>
            </div>
          </div>
        </div>

        {/* Timelines */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Task Timeline */}
          {statistics.timeline.length > 0 && (
            <div className="gh-feature-card rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" /> Task Activity Timeline
              </h2>
              <div className="overflow-x-auto">
                <div className="flex gap-2 min-w-max pb-4">
                  {statistics.timeline.slice(-30).map((day, idx) => {
                    const maxValue = Math.max(...statistics.timeline.map(d => Math.max(d.created, d.completed)));
                    const createdHeight = maxValue > 0 ? (day.created / maxValue) * 100 : 0;
                    const completedHeight = maxValue > 0 ? (day.completed / maxValue) * 100 : 0;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <div className="flex items-end gap-1 h-32">
                          <div className="w-4 bg-blue-500/50 rounded-t" style={{ height: `${createdHeight}%` }} title={`${day.created} created`} />
                          <div className="w-4 bg-green-500/50 rounded-t" style={{ height: `${completedHeight}%` }} title={`${day.completed} completed`} />
                        </div>
                        <span className="text-xs text-slate-500 transform -rotate-45 origin-top-left whitespace-nowrap">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Comment Timeline */}
          {statistics.comments.timeline.length > 0 && (
            <div className="gh-feature-card rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Comment Activity
              </h2>
              <div className="overflow-x-auto">
                <div className="flex gap-2 min-w-max pb-4">
                  {statistics.comments.timeline.slice(-30).map((day, idx) => {
                    const maxComments = Math.max(...statistics.comments.timeline.map(d => d.count));
                    const height = maxComments > 0 ? (day.count / maxComments) * 100 : 0;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <div className="flex items-end h-32">
                          <div className="w-6 bg-orange-500/50 rounded-t" style={{ height: `${height}%` }} title={`${day.count} comments`} />
                        </div>
                        <span className="text-xs text-slate-500 transform -rotate-45 origin-top-left whitespace-nowrap">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Per-Project Breakdown */}
        <div className="gh-feature-card rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Project Breakdown
          </h2>
          {statistics.byProject.length === 0 ? (
            <p className="text-slate-400">No projects in this company.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statistics.byProject.map((p) => (
                <div key={p.id} className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-orange-500/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-semibold truncate">{p.name}</h3>
                    <span className="text-sm text-slate-400">{p.total} tasks</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Completion</span><span className="text-white font-medium">{p.completionRate}%</span></div>
                    <div className="w-full bg-white/5 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${p.completionRate}%` }} /></div>
                    <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                      <div className="text-green-300">Done: {p.completed}</div>
                      <div className="text-blue-300">In Prog: {p.inProgress}</div>
                      <div className="text-slate-300">Todo: {p.todo}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Contributors */}
        {statistics.topContributors.length > 0 && (
          <div className="gh-feature-card rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" /> Top Contributors
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statistics.topContributors.map((c, idx) => (
                <div key={c.userId} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg hover:border-orange-500/50 transition-colors">
                  <div className="relative">
                    {c.imageUrl ? (
                      <Image src={c.imageUrl} alt={c.name} width={48} height={48} className="rounded-full" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-semibold text-lg">
                        {c.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {idx < 3 && (
                      <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-500 text-yellow-900' : idx === 1 ? 'bg-slate-400 text-slate-900' : 'bg-orange-600 text-orange-100'}`}>
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{c.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{c.tasks} tasks</span>
                      <span>•</span>
                      <span>{c.comments} comments</span>
                    </div>
                    <div className="mt-2"><span className="text-orange-400 font-bold text-sm">Score: {c.score}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {statistics.tasks.total === 0 && (
          <div className="gh-feature-card rounded-lg p-12 text-center">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No activity data available yet</p>
            <p className="text-slate-500 text-sm mt-2">Create tasks to start tracking progress</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
