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

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string>('');
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);

  // Listen for enterprise changes from AdminLayout
  useEffect(() => {
    const handleStorageChange = () => {
      const storedEnterpriseId = localStorage.getItem('selectedEnterpriseId');
      if (storedEnterpriseId && storedEnterpriseId !== selectedEnterpriseId) {
        setSelectedEnterpriseId(storedEnterpriseId);
      }
    };

    // Initial load
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
    if (!selectedEnterpriseId) return;
    
    const loadEnterpriseData = async () => {
      try {
        const res = await fetch('/api/enterprises');
        if (res.ok) {
          const data = await res.json();
          const foundEnterprise = data.enterprises?.find((e: Enterprise) => e.id === selectedEnterpriseId);
          setEnterprise(foundEnterprise || null);
        }
      } catch (error) {
        console.error('Failed to load enterprise:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadEnterpriseData();
  }, [selectedEnterpriseId]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-300">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-4">Dashboard</h1>
          
          {enterprise && (
            <div className="gh-feature-card rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Enterprise Information</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-slate-400">Enterprise Name:</span>
                  <p className="text-lg text-white font-medium">{enterprise.name}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-400">Enterprise Code:</span>
                  <div className="mt-1">
                    <span className="inline-block font-mono bg-white/10 border border-white/20 px-4 py-2 rounded-lg text-orange-400 text-lg">
                      {enterprise.inviteCode}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
