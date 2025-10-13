"use client";
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Code2, GitPullRequest, Users, BarChart3, CheckCircle2, GitBranch, MessageSquare, Timer, Rocket } from 'lucide-react';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAuthed = !!session;

  useEffect(() => {
    if (isAuthed) {
      (async () => {
        const res = await fetch('/api/user/assignments');
        if (res.ok) {
          const data = await res.json();
          if (data.hasCreatedEnterprise) {
            router.push('/dashboard');
          }
        }
      })();
    }
  }, [isAuthed, router]);

  return (
    <main className="min-h-screen gh-hero-gradient">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]"></div>
        
        <div className="relative">
          <div className="container mx-auto px-4 py-16 sm:py-24">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 mb-20">
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-2 mb-6">
                  <div className="w-2 h-2 bg-orange-500 rounded-full gh-pulse-dot"></div>
                  <span className="text-orange-400 text-sm font-medium">Streamline Your Development Workflow</span>
                </div>
                
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                  GitHub-Integrated
                  <span className="block bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
                    Project Planner
                  </span>
                </h1>
                
                <p className="text-xl text-slate-300 mb-8 max-w-2xl">
                  A powerful kanban-style task management platform designed for development teams. 
                  Seamlessly integrate GitHub pull requests, track progress, and collaborate with your team in real-time.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <a
                    href={isAuthed ? "/planner" : "/signup"}
                    className="gh-cta-button px-8 py-4 rounded-lg text-white font-semibold text-lg inline-flex items-center justify-center gap-2"
                  >
                    <Rocket className="w-5 h-5" />
                    {isAuthed ? 'Open Planner' : 'Get Started Free'}
                  </a>
                  <a
                    href="#features"
                    className="gh-cta-button-secondary px-8 py-4 rounded-lg font-semibold text-lg inline-flex items-center justify-center gap-2"
                  >
                    Learn More
                  </a>
                </div>
                
                {!isAuthed && (
                  <p className="text-slate-400 mt-4 text-sm">
                    Already have an account?{' '}
                    <a href="/signin" className="text-orange-400 hover:text-orange-300 underline">
                      Sign in here
                    </a>
                  </p>
                )}
              </div>
              
              <div className="flex-1 relative gh-float-animation">
                <div className="relative w-full max-w-lg mx-auto">
                  <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-green-500 rounded-lg blur-2xl opacity-30"></div>
                  <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-white/10">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="gh-icon-wrapper rounded-lg p-4 flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-white" />
                      </div>
                      <div className="gh-icon-wrapper green rounded-lg p-4 flex items-center justify-center">
                        <GitPullRequest className="w-8 h-8 text-white" />
                      </div>
                      <div className="gh-icon-wrapper rounded-lg p-4 flex items-center justify-center">
                        <BarChart3 className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <svg viewBox="0 0 200 100" className="w-full h-32">
                      <polyline
                        points="0,80 40,60 80,70 120,40 160,50 200,20"
                        className="gh-chart-line-orange"
                      />
                      <polyline
                        points="0,90 40,85 80,60 120,65 160,45 200,30"
                        className="gh-chart-line"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div id="features" className="mb-20">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-4">Purpose Built for Developers</h2>
                <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                  GH Planner bridges the gap between project management and code delivery, 
                  giving you complete visibility into your development pipeline.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="gh-feature-card rounded-lg p-6">
                  <div className="gh-icon-wrapper rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                    <GitBranch className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">GitHub Integration</h3>
                  <p className="text-slate-300">
                    Link pull requests directly to tasks. Track PR status, review comments, 
                    and merge status all in one place without switching contexts.
                  </p>
                </div>

                <div className="gh-feature-card rounded-lg p-6">
                  <div className="gh-icon-wrapper green rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">Kanban Board</h3>
                  <p className="text-slate-300">
                    Visualise your workflow with customisable columns. Drag and drop tasks 
                    through stages from backlog to deployment with ease.
                  </p>
                </div>

                <div className="gh-feature-card rounded-lg p-6">
                  <div className="gh-icon-wrapper rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">Team Collaboration</h3>
                  <p className="text-slate-300">
                    Assign tasks to team members, set priorities, and collaborate with 
                    built-in commenting and real-time updates.
                  </p>
                </div>

                <div className="gh-feature-card rounded-lg p-6">
                  <div className="gh-icon-wrapper green rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">Progress Analytics</h3>
                  <p className="text-slate-300">
                    Track velocity, monitor bottlenecks, and gain insights into team 
                    performance with comprehensive analytics dashboards.
                  </p>
                </div>

                <div className="gh-feature-card rounded-lg p-6">
                  <div className="gh-icon-wrapper rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">CI/CD Monitoring</h3>
                  <p className="text-slate-300">
                    See build and deployment status at a glance. Know when PRs pass tests 
                    and are ready for review or merge.
                  </p>
                </div>

                <div className="gh-feature-card rounded-lg p-6">
                  <div className="gh-icon-wrapper green rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">Task Discussions</h3>
                  <p className="text-slate-300">
                    Keep conversations contextual with task-specific comment threads. 
                    Never lose track of important decisions or feedback.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-20">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
                <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                  Get started in minutes and transform how your team manages development work
                </p>
              </div>

              <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="gh-step-number rounded-full w-16 h-16 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-white mb-3">Create Your Enterprise</h3>
                    <p className="text-slate-300 text-lg">
                      Sign up and set up your organisation. Invite team members and create 
                      companies and projects to organise your work structure.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="gh-step-number rounded-full w-16 h-16 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-white mb-3">Connect GitHub</h3>
                    <p className="text-slate-300 text-lg">
                      Integrate your GitHub repositories with a secure OAuth token. GH Planner 
                      will sync PR data and status automatically.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="gh-step-number rounded-full w-16 h-16 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-white mb-3">Build Your Board</h3>
                    <p className="text-slate-300 text-lg">
                      Create custom columns that match your workflow. Add tasks, set priorities, 
                      assign team members, and link GitHub PRs to track code changes.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="gh-step-number rounded-full w-16 h-16 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-white mb-3">Track & Deliver</h3>
                    <p className="text-slate-300 text-lg">
                      Monitor progress in real-time, collaborate with comments, and move tasks 
                      through your pipeline. Watch as merged PRs automatically update task status.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500/10 to-green-500/10 border border-orange-500/20 rounded-2xl p-12 text-center">
              <h2 className="text-4xl font-bold text-white mb-4">Ready to Streamline Your Workflow?</h2>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Join development teams who have transformed their project management with GitHub-integrated planning.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={isAuthed ? "/planner" : "/signup"}
                  className="gh-cta-button px-10 py-4 rounded-lg text-white font-semibold text-lg inline-flex items-center justify-center gap-2"
                >
                  <Rocket className="w-5 h-5" />
                  {isAuthed ? 'Go to Planner' : 'Start Planning Now'}
                </a>
                {!isAuthed && (
                  <a
                    href="/signin"
                    className="gh-cta-button-secondary px-10 py-4 rounded-lg font-semibold text-lg inline-flex items-center justify-center gap-2"
                  >
                    Sign In
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t border-white/10 mt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Code2 className="w-6 h-6 text-orange-500" />
                <span className="text-white font-semibold text-lg">GH Planner</span>
              </div>
              <p className="text-slate-400 text-sm">
                Streamline your development workflow with GitHub-integrated planning
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
