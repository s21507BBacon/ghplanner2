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
    <div className="min-h-screen gh-hero-gradient">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Enterprises</h1>
          <button 
            onClick={() => router.push('/dashboard')}
            className="gh-cta-button px-5 py-3 rounded-lg text-white font-semibold"
          >
            Go to Dashboard
          </button>
        </div>

        {enterprises.length === 0 ? (
          <div className="gh-feature-card rounded-lg p-6">
            <p className="text-slate-300">You are not a member of any enterprises yet.</p>
          </div>
        ) : (
          <>
            <div className="gh-feature-card rounded-lg p-6">
              <div className="flex gap-4 items-center flex-wrap">
                <label className="text-sm font-medium text-slate-300">Select Enterprise:</label>
                <select 
                  value={selectedEnterpriseId} 
                  onChange={(e) => setSelectedEnterpriseId(e.target.value)} 
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                >
                  {enterprises.map(e => (
                    <option key={e.id} value={e.id} className="bg-[#1a2332]">{e.name}</option>
                  ))}
                </select>
                {selectedEnterprise && (
                  <div className="text-sm text-slate-300">
                    Invite Code: <span className="font-mono bg-white/10 px-3 py-1 rounded">{selectedEnterprise.inviteCode}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="gh-feature-card rounded-lg p-6">
              <h2 className="font-semibold text-white mb-3 text-xl">Companies in this Enterprise</h2>
              {companies.length === 0 ? (
                <p className="text-sm text-slate-300">No companies yet. Create one from the dashboard.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {companies.map(c => (
                    <div key={c.id} className="bg-white/5 border border-white/10 rounded p-4 hover:border-orange-500/50 transition-colors">
                      <div className="font-medium text-white">{c.name}</div>
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
