"use client";
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, BarChart3, CheckCircle2, GitBranch, MessageSquare, Rocket } from 'lucide-react';
import Image from 'next/image';

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
          <div className="container mx-auto px-4 py-28 sm:py-36">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 mb-24 min-h-[600px]">
              <div className="flex-1 text-center lg:text-left max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-5 py-2.5 mb-7">
                  <div className="w-2.5 h-2.5 bg-orange-500 rounded-full gh-pulse-dot"></div>
                  <span className="text-orange-400 text-base font-medium">Streamline Your Development Workflow</span>
                </div>
                
                <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold text-white mb-7 leading-tight">
                  Git-
                  <span className="block">Integrated</span>
                  <span className="block bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
                    Project Planner
                  </span>
                </h1>
                
                <p className="text-xl text-slate-300 mb-10 max-w-2xl">
                  A powerful kanban-style task management platform designed for development teams. 
                  Seamlessly integrate GitHub pull requests, track progress, and collaborate with your team in real-time.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
                  <a
                    href={isAuthed ? "/planner" : "/signup"}
                    className="gh-cta-button px-10 py-5 rounded-lg text-white font-semibold text-xl inline-flex items-center justify-center gap-2.5"
                  >
                    <Rocket className="w-6 h-6" />
                    {isAuthed ? 'Open Planner' : 'Get Started Free'}
                  </a>
                  <a
                    href="#features"
                    className="gh-cta-button-secondary px-10 py-5 rounded-lg font-semibold text-xl inline-flex items-center justify-center gap-2.5"
                  >
                    Learn More
                  </a>
                </div>
                
                {!isAuthed && (
                  <p className="text-slate-400 mt-5 text-base">
                    Already have an account?{' '}
                    <a href="/signin" className="text-orange-400 hover:text-orange-300 underline">
                      Sign in here
                    </a>
                  </p>
                )}
              </div>
              
              <div className="flex-1 relative gh-float-animation max-w-xl">
                <div className="relative w-full">
                  <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-green-500 rounded-lg blur-2xl opacity-30"></div>
                  <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-lg p-12 border border-white/10">
                    <div className="flex justify-center">
                      <div className="relative w-full">
                        <div className="absolute -inset-4 bg-gradient-to-r from-orange-500 to-green-500 rounded-full blur-xl opacity-40"></div>
                        <Image 
                          src="/logo.png" 
                          alt="GH Planner Logo" 
                          width={400} 
                          height={400} 
                          className="relative w-full h-auto"
                          priority
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div id="features" className="mb-24">
              <div className="text-center mb-14">
                <h2 className="text-5xl font-bold text-white mb-5">Purpose Built for Developers</h2>
                <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                  GH Planner bridges the gap between project management and code delivery, 
                  giving you complete visibility into your development pipeline.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                <div className="gh-feature-card rounded-lg p-7">
                  <div className="gh-icon-wrapper rounded-lg w-14 h-14 flex items-center justify-center mb-5">
                    <GitBranch className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-4">GitHub Integration</h3>
                  <p className="text-slate-300 text-base">
                    Link pull requests directly to tasks. Track PR status, review comments, 
                    and merge status all in one place without switching contexts.
                  </p>
                </div>

                <div className="gh-feature-card rounded-lg p-7">
                  <div className="gh-icon-wrapper green rounded-lg w-14 h-14 flex items-center justify-center mb-5">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-4">Kanban Board</h3>
                  <p className="text-slate-300 text-base">
                    Visualise your workflow with customisable columns. Drag and drop tasks 
                    through stages from backlog to deployment with ease.
                  </p>
                </div>

                <div className="gh-feature-card rounded-lg p-7">
                  <div className="gh-icon-wrapper rounded-lg w-14 h-14 flex items-center justify-center mb-5">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-4">Team Collaboration</h3>
                  <p className="text-slate-300 text-base">
                    Assign tasks to team members, set priorities, and collaborate with 
                    built-in commenting and real-time updates.
                  </p>
                </div>

                <div className="gh-feature-card rounded-lg p-7">
                  <div className="gh-icon-wrapper green rounded-lg w-14 h-14 flex items-center justify-center mb-5">
                    <BarChart3 className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-4">Progress Analytics</h3>
                  <p className="text-slate-300 text-base">
                    Track velocity, monitor bottlenecks, and gain insights into team 
                    performance with comprehensive analytics dashboards.
                  </p>
                </div>

                <div className="gh-feature-card rounded-lg p-7">
                  <div className="gh-icon-wrapper rounded-lg w-14 h-14 flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-4">CI/CD Monitoring</h3>
                  <p className="text-slate-300 text-base">
                    See build and deployment status at a glance. Know when PRs pass tests 
                    and are ready for review or merge.
                  </p>
                </div>

                <div className="gh-feature-card rounded-lg p-7">
                  <div className="gh-icon-wrapper green rounded-lg w-14 h-14 flex items-center justify-center mb-5">
                    <MessageSquare className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-4">Task Discussions</h3>
                  <p className="text-slate-300 text-base">
                    Keep conversations contextual with task-specific comment threads. 
                    Never lose track of important decisions or feedback.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-24">
              <div className="text-center mb-14">
                <h2 className="text-5xl font-bold text-white mb-5">How It Works</h2>
                <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                  Get started in minutes and transform how your team manages development work
                </p>
              </div>

              <div className="max-w-5xl mx-auto space-y-10">
                <div className="flex flex-col md:flex-row gap-7 items-start">
                  <div className="gh-step-number rounded-full w-20 h-20 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-semibold text-white mb-4">Create Your Enterprise</h3>
                    <p className="text-slate-300 text-lg">
                      Sign up and set up your organisation. Invite team members and create 
                      companies and projects to organise your work structure.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-7 items-start">
                  <div className="gh-step-number rounded-full w-20 h-20 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-semibold text-white mb-4">Connect GitHub</h3>
                    <p className="text-slate-300 text-lg">
                      Integrate your GitHub repositories with a secure OAuth token. GH Planner 
                      will sync PR data and status automatically.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-7 items-start">
                  <div className="gh-step-number rounded-full w-20 h-20 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-semibold text-white mb-4">Build Your Board</h3>
                    <p className="text-slate-300 text-lg">
                      Create custom columns that match your workflow. Add tasks, set priorities, 
                      assign team members, and link GitHub PRs to track code changes.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-7 items-start">
                  <div className="gh-step-number rounded-full w-20 h-20 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-semibold text-white mb-4">Track & Deliver</h3>
                    <p className="text-slate-300 text-lg">
                      Monitor progress in real-time, collaborate with comments, and move tasks 
                      through your pipeline. Watch as merged PRs automatically update task status.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500/10 to-green-500/10 border border-orange-500/20 rounded-2xl p-14 text-center">
              <h2 className="text-5xl font-bold text-white mb-5">Ready to Streamline Your Workflow?</h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Join development teams who have transformed their project management with GitHub-integrated planning.
              </p>
              <div className="flex flex-col sm:flex-row gap-5 justify-center">
                <a
                  href={isAuthed ? "/planner" : "/signup"}
                  className="gh-cta-button px-12 py-5 rounded-lg text-white font-semibold text-xl inline-flex items-center justify-center gap-2.5"
                >
                  <Rocket className="w-6 h-6" />
                  {isAuthed ? 'Go to Planner' : 'Start Planning Now'}
                </a>
                {!isAuthed && (
                  <a
                    href="/signin"
                    className="gh-cta-button-secondary px-12 py-5 rounded-lg font-semibold text-xl inline-flex items-center justify-center gap-2.5"
                  >
                    Sign In
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t border-white/10 mt-24">
          <div className="container mx-auto px-4 py-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-5">
              <div className="flex items-center gap-3">
                <Image 
                  src="/mcpeak-bacon-logo.png" 
                  alt="McPeak Bacon Limited Logo" 
                  width={50} 
                  height={50}
                  className="object-contain"
                />
                <span className="text-white font-semibold text-2xl">McPeak Bacon Limited</span>
              </div>
              <p className="text-slate-400 text-base">
                Gh Planner is a McPeak Bacon Limited Product © 2025
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
