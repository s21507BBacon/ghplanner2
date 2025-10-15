'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Github, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface GitHubStatus {
  connected: boolean;
  username: string | null;
  connectedAt: string | null;
}

export default function GitHubConnection() {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/github/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch GitHub status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    // Use NextAuth GitHub provider to connect
    await signIn('github', { callbackUrl: window.location.href });
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub account? You will no longer be able to sync comments to PRs.')) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch('/api/user/github/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setStatus({ connected: false, username: null, connectedAt: null });
      } else {
        alert('Failed to disconnect GitHub account');
      }
    } catch (error) {
      console.error('Failed to disconnect GitHub:', error);
      alert('Failed to disconnect GitHub account');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1a2332] border border-white/10 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          <span className="text-slate-300">Loading GitHub connection status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a2332] border border-white/10 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Github className="w-6 h-6 text-white" />
            <h3 className="text-lg font-semibold text-white">GitHub Integration</h3>
          </div>
          
          {status?.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-slate-300">
                  Connected as <span className="font-mono text-white">{status.username}</span>
                </span>
              </div>
              
              {status.connectedAt && (
                <p className="text-sm text-slate-400">
                  Connected on {new Date(status.connectedAt).toLocaleDateString()}
                </p>
              )}
              
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-300">
                  <strong>✓ Enabled features:</strong>
                </p>
                <ul className="text-sm text-blue-200 mt-2 space-y-1 ml-4 list-disc">
                  <li>Automatically post task comments to GitHub PRs</li>
                  <li>Approve code reviews directly from tasks</li>
                  <li>Request changes on PRs from task interface</li>
                </ul>
              </div>

              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {disconnecting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Disconnecting...
                  </span>
                ) : (
                  'Disconnect GitHub'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">Not connected</span>
              </div>
              
              <p className="text-sm text-slate-400">
                Connect your GitHub account to automatically sync task comments to pull requests and interact with PRs directly from the task interface.
              </p>

              <button
                onClick={handleConnect}
                className="mt-4 gh-cta-button px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                Connect GitHub Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
