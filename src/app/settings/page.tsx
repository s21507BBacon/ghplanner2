'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Settings as SettingsIcon } from 'lucide-react';
import GitHubConnection from '@/components/GitHubConnection';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!session) {
    router.push('/signin');
    return null;
  }

  return (
    <div className="min-h-screen gh-hero-gradient">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-8 h-8 text-orange-400" />
            <h1 className="text-3xl font-bold text-white">Settings</h1>
          </div>
          <p className="text-slate-300">Manage your account and integrations</p>
        </div>

        {/* User Info Section */}
        <div className="space-y-6">
          <div className="bg-[#1a2332] border border-white/10 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-6 h-6 text-white" />
              <h2 className="text-xl font-semibold text-white">Account Information</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400">Name</label>
                <p className="text-white font-medium">{session.user?.name || 'Not set'}</p>
              </div>
              
              <div>
                <label className="text-sm text-slate-400">Email</label>
                <p className="text-white font-medium">{session.user?.email}</p>
              </div>
            </div>
          </div>

          {/* GitHub Integration Section */}
          <GitHubConnection />

          {/* Additional Settings Sections Can Be Added Here */}
        </div>
      </div>
    </div>
  );
}
