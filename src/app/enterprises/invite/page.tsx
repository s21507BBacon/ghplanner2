'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface InviteDetails {
  enterpriseName: string;
  inviterName: string;
  expired: boolean;
}

function EnterpriseInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const token = searchParams.get('token');

  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    const fetchInviteDetails = async () => {
      try {
        const response = await fetch(`/api/enterprises/invite/details?token=${token}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load invite');
        }
        const data = await response.json();
        setInviteDetails(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInviteDetails();
  }, [token]);

  useEffect(() => {
    if (status === 'authenticated' && inviteDetails && !inviteDetails.expired) {
      acceptInvite();
    }
  }, [status, inviteDetails]);

  const acceptInvite = async () => {
    if (!token || accepting) return;

    setAccepting(true);
    try {
      const response = await fetch('/api/enterprises/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept invite');
      }

      const data = await response.json();
      router.push(`/enterprises/${data.enterpriseId}`);
    } catch (err: any) {
      setError(err.message);
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !inviteDetails) {
    return (
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#1a2332] border border-white/10 rounded-lg shadow-2xl p-8 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
          <p className="text-slate-300 mb-6">{error || 'This invitation link is invalid or has expired.'}</p>
          <Link 
            href="/dashboard"
            className="gh-cta-button inline-block px-6 py-3 rounded-lg text-white font-semibold"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (inviteDetails.expired) {
    return (
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#1a2332] border border-white/10 rounded-lg shadow-2xl p-8 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invitation Expired</h1>
          <p className="text-slate-300 mb-6">
            This invitation to join <strong>{inviteDetails.enterpriseName}</strong> has expired.
            Please contact {inviteDetails.inviterName} for a new invitation.
          </p>
          <Link 
            href="/dashboard"
            className="gh-cta-button inline-block px-6 py-3 rounded-lg text-white font-semibold"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'loading' || accepting) {
    return (
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p className="text-slate-300">
            {accepting ? 'Joining enterprise...' : 'Checking authentication...'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#1a2332] border border-white/10 rounded-lg shadow-2xl p-8">
          <div className="text-center mb-6">
            <svg className="mx-auto h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            You've Been Invited!
          </h1>
          <p className="text-slate-300 mb-6 text-center">
            {inviteDetails.inviterName} has invited you to join <strong>{inviteDetails.enterpriseName}</strong> on GitHub Planner.
          </p>
          <div className="space-y-3">
            <Link 
              href={`/signin?callbackUrl=${encodeURIComponent(`/enterprises/invite?token=${token}`)}`}
              className="gh-cta-button block w-full text-white text-center px-6 py-3 rounded-lg font-semibold"
            >
              Sign In to Accept
            </Link>
            <Link 
              href={`/signup?callbackUrl=${encodeURIComponent(`/enterprises/invite?token=${token}`)}`}
              className="gh-cta-button-secondary block w-full text-center px-6 py-3 rounded-lg font-semibold bg-transparent"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function EnterpriseInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    }>
      <EnterpriseInviteContent />
    </Suspense>
  );
}

