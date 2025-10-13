'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Enterprise {
  id: string;
  name: string;
  inviteCode: string;
  ownerUserId: string;
}

interface Company {
  id: string;
  name: string;
}

interface Member {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role: string;
  status: string;
}

export default function EnterpriseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const enterpriseId = params.id as string;

  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [uploadResult, setUploadResult] = useState<{sent: number, failed: number, errors?: string[]} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GitHub token management state
  const [githubToken, setGithubToken] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const [hasGithubToken, setHasGithubToken] = useState(false);
  const [showTokenForm, setShowTokenForm] = useState(false);

  const isOwner = enterprise && session && (session as any).userId === enterprise.ownerUserId;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
      return;
    }

    if (status === 'authenticated') {
      loadEnterpriseData();
    }
  }, [status, enterpriseId]);

  useEffect(() => {
    if (enterprise && isOwner) {
      loadGithubTokenStatus();
    }
  }, [enterprise, isOwner]);

  const loadEnterpriseData = async () => {
    try {
      const [enterpriseRes, companiesRes, membersRes] = await Promise.all([
        fetch('/api/enterprises'),
        fetch(`/api/enterprises/${enterpriseId}/companies`),
        fetch(`/api/enterprises/${enterpriseId}/members`)
      ]);

      if (!enterpriseRes.ok) throw new Error('Failed to load enterprise');

      const enterprisesData = await enterpriseRes.json();
      const foundEnterprise = enterprisesData.enterprises?.find((e: Enterprise) => e.id === enterpriseId);

      if (!foundEnterprise) {
        throw new Error('Enterprise not found');
      }

      setEnterprise(foundEnterprise);

      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData.companies || []);
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadGithubTokenStatus = async () => {
    if (!isOwner) return;

    try {
      const response = await fetch(`/api/enterprises/${enterpriseId}/github-token`);
      if (response.ok) {
        const data = await response.json();
        setHasGithubToken(data.hasToken);
      }
    } catch (err) {
      console.error('Failed to load GitHub token status:', err);
    }
  };

  const saveGithubToken = async () => {
    if (!githubToken.trim()) return;

    setSavingToken(true);
    setError(null);

    try {
      const response = await fetch(`/api/enterprises/${enterpriseId}/github-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubToken: githubToken.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save GitHub token');
      }

      setHasGithubToken(true);
      setGithubToken('');
      setShowTokenForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingToken(false);
    }
  };

  const removeGithubToken = async () => {
    if (!confirm('Are you sure you want to remove your GitHub token? This will disable GitHub integration for projects in this enterprise.')) {
      return;
    }

    setSavingToken(true);
    setError(null);

    try {
      const response = await fetch(`/api/enterprises/${enterpriseId}/github-token`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove GitHub token');
      }

      setHasGithubToken(false);
      setShowTokenForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingToken(false);
    }
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCSV(true);
    setUploadResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('csv', file);

      const response = await fetch(`/api/enterprises/${enterpriseId}/invite`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invites');
      }

      const result = await response.json();
      setUploadResult(result);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingCSV(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading enterprise...</p>
        </div>
      </div>
    );
  }

  if (error || !enterprise) {
    return (
      <div className="min-h-screen gh-hero-gradient">
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400 mb-4">{error || 'Enterprise not found'}</p>
            <Link 
              href="/enterprises"
              className="gh-cta-button inline-block px-6 py-3 rounded-lg text-white font-semibold"
            >
              Back to Enterprises
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gh-hero-gradient">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              href="/enterprises"
              className="text-orange-400 hover:text-orange-300 text-sm mb-2 inline-block transition-colors"
            >
              ← Back to Enterprises
            </Link>
            <h1 className="text-3xl font-bold text-white">{enterprise.name}</h1>
          </div>
          <Link
            href="/dashboard"
            className="gh-cta-button px-5 py-3 rounded-lg text-white font-semibold"
          >
            Go to Dashboard
          </Link>
        </div>

        <div className="gh-feature-card rounded-lg p-6">
          <h2 className="font-semibold text-white text-xl mb-4">Enterprise Details</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-300">Invite Code:</span>
              <span className="font-mono bg-white/10 px-3 py-1 rounded text-sm text-white">
                {enterprise.inviteCode}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-300">Your Role:</span>
              <span className="font-medium text-sm">{isOwner ? 'Owner' : 'Member'}</span>
            </div>
          </div>
        </div>

        {isOwner && (
          <>
            <div className="gh-feature-card rounded-lg p-6">
              <h2 className="font-semibold text-white text-xl mb-2">Send Invitations</h2>
              <p className="text-sm text-slate-600 mb-4">
                Upload a CSV file containing email addresses to invite users to join this enterprise.
                The CSV should have an &quot;email&quot; column and optionally a &quot;name&quot; or &quot;first name&quot; column.
              </p>
            
            <div className="mb-4">
              <label className="block">
                <span className="sr-only">Choose CSV file</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  disabled={uploadingCSV}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </label>
            </div>

            {uploadingCSV && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-800">Sending invitations...</span>
                </div>
              </div>
            )}

            {uploadResult && (
              <div className={`border rounded-lg p-4 ${
                uploadResult.failed > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
              }`}>
                <p className="font-medium text-sm mb-2">
                  {uploadResult.sent > 0 && (
                    <span className="text-green-700">
                      Successfully sent {uploadResult.sent} invitation{uploadResult.sent !== 1 ? 's' : ''}
                    </span>
                  )}
                  {uploadResult.failed > 0 && (
                    <span className="text-yellow-700 block">
                      Failed to send {uploadResult.failed} invitation{uploadResult.failed !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm text-yellow-800 cursor-pointer hover:underline">
                      Show errors
                    </summary>
                    <ul className="mt-2 text-xs text-yellow-700 space-y-1 ml-4">
                      {uploadResult.errors.map((err, idx) => (
                        <li key={idx} className="list-disc">{err}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-300 font-medium mb-2">Example CSV format:</p>
              <pre className="text-xs text-slate-300 bg-black/30 p-3 rounded border border-white/10 overflow-x-auto">
{`email,name
john@example.com,John Smith
jane@example.com,Jane Doe`}
              </pre>
              <p className="text-xs text-slate-400 mt-2">
                The CSV can have any columns. The system will automatically detect &quot;email&quot;, &quot;e-mail&quot;,
                or &quot;email address&quot; columns, and &quot;name&quot;, &quot;first name&quot;, or &quot;firstname&quot; columns.
              </p>
            </div>
          </div>

          <div className="gh-feature-card rounded-lg p-6">
            <h2 className="font-semibold text-white text-xl mb-2">GitHub Integration</h2>
            <p className="text-sm text-slate-600 mb-4">
              Configure your personal GitHub access token to enable GitHub integration for projects in this enterprise.
              This token will be used to fetch pull request information, check merge status, and update task statuses automatically.
            </p>

            {hasGithubToken ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">GitHub token configured</p>
                    <p className="text-xs text-green-600">Your personal GitHub token is active for this enterprise.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTokenForm(true)}
                    className="gh-cta-button px-4 py-2 rounded-lg text-white font-semibold text-sm"
                  >
                    Update Token
                  </button>
                  <button
                    onClick={removeGithubToken}
                    disabled={savingToken}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingToken ? 'Removing...' : 'Remove Token'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800">No GitHub token configured</p>
                    <p className="text-xs text-amber-600">GitHub integration is disabled for projects in this enterprise.</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowTokenForm(true)}
                  className="gh-cta-button-secondary px-4 py-2 rounded-lg font-semibold text-sm bg-transparent"
                >
                  Add GitHub Token
                </button>
              </div>
            )}

            {showTokenForm && (
              <div className="mt-6 border-t pt-6">
                <h3 className="font-medium text-base mb-3">
                  {hasGithubToken ? 'Update GitHub Token' : 'Add GitHub Token'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Personal Access Token
                    </label>
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors font-mono text-sm"
                    />
                    <p className="text-xs text-slate-400 mt-2">
                      Enter your GitHub personal access token. The token needs &quot;repo&quot; scope for private repositories.
                      <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 ml-1">
                        Create token →
                      </a>
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={saveGithubToken}
                      disabled={savingToken || !githubToken.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingToken ? 'Saving...' : (hasGithubToken ? 'Update Token' : 'Save Token')}
                    </button>
                    <button
                      onClick={() => {
                        setShowTokenForm(false);
                        setGithubToken('');
                      }}
                      className="px-4 py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          </>
        )}

        <div className="gh-feature-card rounded-lg p-6">
          <h2 className="font-semibold text-white text-xl mb-4">Members ({members.length})</h2>
          {members.length === 0 ? (
            <p className="text-sm text-slate-300">No members yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-3 font-medium text-white">Name</th>
                    <th className="text-left py-2 px-3 font-medium text-white">Email</th>
                    <th className="text-left py-2 px-3 font-medium text-white">Role</th>
                    <th className="text-left py-2 px-3 font-medium text-white">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} className="border-b border-white/10 hover:bg-white/5 text-slate-300">
                      <td className="py-2 px-3">{member.userName || '-'}</td>
                      <td className="py-2 px-3">{member.userEmail || '-'}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          member.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="gh-feature-card rounded-lg p-6">
          <h2 className="font-semibold text-white text-xl mb-4">Companies ({companies.length})</h2>
          {companies.length === 0 ? (
            <p className="text-sm text-slate-300">No companies yet. Create one from the dashboard.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {companies.map(company => (
                <div key={company.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-orange-500/50 transition-colors">
                  <div className="font-medium text-white">{company.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

