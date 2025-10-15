"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminLayout from '@/components/AdminLayout';

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

  // Listen for enterprise changes from AdminLayout
  useEffect(() => {
    const handleStorageChange = () => {
      const storedEnterpriseId = localStorage.getItem('selectedEnterpriseId');
      if (storedEnterpriseId && storedEnterpriseId !== selectedEnterpriseId) {
        setSelectedEnterpriseId(storedEnterpriseId);
      }
    };

    // Initial load from localStorage
    const storedEnterpriseId = localStorage.getItem('selectedEnterpriseId');
    if (storedEnterpriseId) {
      setSelectedEnterpriseId(storedEnterpriseId);
    }

    // Listen for changes
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('enterpriseChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('enterpriseChanged', handleStorageChange);
    };
  }, [selectedEnterpriseId]);

  useEffect(() => {
    if (session === null) router.push('/signin');
  }, [session, router]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/enterprises');
      if (!res.ok) return;
      const data = await res.json();
      setEnterprises(data.enterprises || []);
      if (data.enterprises?.length && !selectedEnterpriseId) {
        const storedEnterpriseId = localStorage.getItem('selectedEnterpriseId');
        const enterpriseToSelect = storedEnterpriseId && data.enterprises.find((e: Enterprise) => e.id === storedEnterpriseId)
          ? storedEnterpriseId
          : data.enterprises[0].id;
        
        setSelectedEnterpriseId(enterpriseToSelect);
        localStorage.setItem('selectedEnterpriseId', enterpriseToSelect);
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
    <AdminLayout>
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

        {companies.length === 0 ? (
          <div className="gh-feature-card rounded-lg p-6">
            <p className="text-slate-300">No companies yet. Create one from the Projects page.</p>
          </div>
        ) : (
          <div className="gh-feature-card rounded-lg p-6">
            <h2 className="font-semibold text-white mb-3 text-xl">Companies</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {companies.map(c => (
                <div key={c.id} className="bg-white/5 border border-white/10 rounded p-4 hover:border-orange-500/50 transition-colors">
                  <div className="font-medium text-white">{c.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
