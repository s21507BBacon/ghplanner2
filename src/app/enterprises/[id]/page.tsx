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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading enterprise...</p>
        </div>
      </div>
    );
  }

  if (error || !enterprise) {
    return (
      <div className="min-h-screen bg-slate-50 pt-16">
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-4">{error || 'Enterprise not found'}</p>
            <Link 
              href="/enterprises"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Enterprises
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              href="/enterprises"
              className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
            >
              ← Back to Enterprises
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">{enterprise.name}</h1>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="font-semibold text-lg mb-4">Enterprise Details</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Invite Code:</span>
              <span className="font-mono bg-slate-100 px-3 py-1 rounded text-sm">
                {enterprise.inviteCode}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Your Role:</span>
              <span className="font-medium text-sm">{isOwner ? 'Owner' : 'Member'}</span>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-semibold text-lg mb-2">Send Invitations</h2>
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
              <p className="text-xs text-slate-600 font-medium mb-2">Example CSV format:</p>
              <pre className="text-xs text-slate-700 bg-white p-3 rounded border border-slate-200 overflow-x-auto">
{`email,name
john@example.com,John Smith
jane@example.com,Jane Doe`}
              </pre>
              <p className="text-xs text-slate-500 mt-2">
                The CSV can have any columns. The system will automatically detect &quot;email&quot;, &quot;e-mail&quot;, 
                or &quot;email address&quot; columns, and &quot;name&quot;, &quot;first name&quot;, or &quot;firstname&quot; columns.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="font-semibold text-lg mb-4">Members ({members.length})</h2>
          {members.length === 0 ? (
            <p className="text-sm text-slate-600">No members yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-medium text-slate-700">Name</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-700">Email</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-700">Role</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50">
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

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="font-semibold text-lg mb-4">Companies ({companies.length})</h2>
          {companies.length === 0 ? (
            <p className="text-sm text-slate-600">No companies yet. Create one from the dashboard.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {companies.map(company => (
                <div key={company.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                  <div className="font-medium">{company.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

