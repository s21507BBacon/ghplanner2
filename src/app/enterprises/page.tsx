"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Enterprise { 
  id: string; 
  name: string; 
  inviteCode: string;
}

interface Company { 
  id: string; 
  name: string; 
  enterpriseId?: string;
}

export default function EnterprisesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    if (session === null) router.push('/signin');
  }, [session, router]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/enterprises');
      if (!res.ok) return;
      const data = await res.json();
      setEnterprises(data.enterprises || []);
      if (data.enterprises?.length) {
        setSelectedEnterpriseId(data.enterprises[0].id);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedEnterpriseId) return;
    (async () => {
      const res = await fetch(`/api/enterprises/${selectedEnterpriseId}/companies`);
      if (!res.ok) return;
      const data = await res.json();
      setCompanies(data.companies || []);
    })();
  }, [selectedEnterpriseId]);

  const selectedEnterprise = enterprises.find(e => e.id === selectedEnterpriseId);

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Enterprises</h1>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>

        {enterprises.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <p className="text-slate-600">You are not a member of any enterprises yet.</p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex gap-3 items-center flex-wrap">
                <label className="text-sm font-medium text-slate-700">Select Enterprise:</label>
                <select 
                  value={selectedEnterpriseId} 
                  onChange={(e) => setSelectedEnterpriseId(e.target.value)} 
                  className="px-3 py-2 border rounded-lg"
                >
                  {enterprises.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                {selectedEnterprise && (
                  <div className="text-sm text-slate-600">
                    Invite Code: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{selectedEnterprise.inviteCode}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="font-semibold mb-3">Companies in this Enterprise</h2>
              {companies.length === 0 ? (
                <p className="text-sm text-slate-600">No companies yet. Create one from the dashboard.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {companies.map(c => (
                    <div key={c.id} className="border border-slate-200 rounded p-4 hover:bg-slate-50">
                      <div className="font-medium">{c.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
