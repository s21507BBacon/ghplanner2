'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateEnterprisePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [enterpriseName, setEnterpriseName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!enterpriseName.trim()) {
      setError('Please enter an enterprise name');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const response = await fetch('/api/enterprises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: enterpriseName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        // Persist selection so AdminLayout focuses the new enterprise
        if (typeof window !== 'undefined' && data?.id) {
          localStorage.setItem('selectedEnterpriseId', data.id);
          window.dispatchEvent(new Event('enterpriseChanged'));
        }
        // Redirect to dashboard after creating
        router.push('/dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create enterprise');
      }
    } catch (err) {
      setError('An error occurred while creating the enterprise');
    } finally {
      setCreating(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/signin?callbackUrl=/enterprises/create');
    return null;
  }

  return (
    <div className="min-h-screen gh-hero-gradient flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-[#1a2332] border border-white/10 rounded-lg shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-orange-500 to-green-500 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Enterprise</h1>
            <p className="text-slate-300">
              Start your own enterprise and invite team members to collaborate.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Enterprise Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={enterpriseName}
                onChange={(e) => setEnterpriseName(e.target.value)}
                placeholder="e.g., Acme Corporation"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && enterpriseName.trim()) {
                    handleCreate();
                  }
                }}
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={!enterpriseName.trim() || creating}
              className="gh-cta-button w-full px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                'Create Enterprise'
              )}
            </button>

            <div className="border-t border-white/10 pt-6">
              <p className="text-sm text-slate-400 text-center">
                After creating your enterprise, you'll be able to add companies, projects, and invite team members.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
