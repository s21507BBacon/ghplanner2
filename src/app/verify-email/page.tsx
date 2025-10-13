'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    // Prevent double-call in React Strict Mode
    if (hasVerified.current) return;
    hasVerified.current = true;

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (token: string) => {
    try {
      console.log('[VERIFY PAGE] Sending verification request with token:', token);
      
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      console.log('[VERIFY PAGE] Response:', response.status, data);

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        
        // Check if already verified
        if (data.alreadyVerified) {
          setMessage('Your email is already verified! You can sign in now.');
        }
        
        // Redirect to sign-in after 3 seconds
        setTimeout(() => {
          router.push('/signin');
        }, 3000);
      } else {
        setStatus('error');
        // Show specific error message
        if (response.status === 404) {
          setMessage('This verification link is invalid or has already been used. If you can sign in, your email is already verified.');
        } else if (response.status === 410) {
          setMessage(data.error || 'This verification link has expired.');
        } else {
          setMessage(data.error || 'Failed to verify email');
        }
      }
    } catch (error) {
      console.error('[VERIFY PAGE] Error:', error);
      setStatus('error');
      setMessage('An error occurred during verification');
    }
  };

  return (
    <div className="min-h-screen gh-hero-gradient flex items-center justify-center p-4">
      <div className="bg-[#1a2332] border border-white/10 rounded-lg p-8 w-full max-w-md text-center shadow-2xl">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-orange-400 mx-auto mb-4 animate-spin" />
            <h1 className="text-3xl font-semibold text-white mb-2">
              Verifying Email
            </h1>
            <p className="text-slate-300">
              Please wait while we verify your email address...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-3xl font-semibold text-white mb-2">
              Email Verified!
            </h1>
            <p className="text-slate-300 mb-4">{message}</p>
            <p className="text-sm text-slate-400">
              Redirecting to sign in page...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-3xl font-semibold text-white mb-2">
              Verification Issue
            </h1>
            <p className="text-slate-300 mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push('/signin')}
                className="gh-cta-button px-5 py-3 rounded-lg text-white font-semibold transition-colors"
              >
                Try Signing In
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="px-5 py-3 bg-white/5 text-slate-300 hover:bg-white/10 rounded-lg transition-colors"
              >
                Sign Up with Different Email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center p-4">
        <div className="bg-[#1a2332] border border-white/10 rounded-lg p-8 w-full max-w-md text-center shadow-2xl">
          <Loader2 className="w-16 h-16 text-orange-400 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-semibold text-white mb-2">Loading...</h1>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

