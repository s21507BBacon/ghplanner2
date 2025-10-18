"use client";
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('Email verified successfully! You can now sign in.');
    }
  }, [searchParams]);

  const handleUserRedirect = async () => {
    const assignmentsRes = await fetch('/api/user/assignments');
    if (assignmentsRes.ok) {
      const data = await assignmentsRes.json();
      
      if (data.hasCreatedEnterprise) {
        router.push('/dashboard');
        return;
      }
      
      if (data.isOwnerOrAdmin) {
        router.push('/dashboard');
        return;
      }
      
      if (data.hasAssignments && data.assignments.length > 0 && data.assignments[0].projects.length > 0) {
        const firstCompany = data.assignments[0];
        const firstProject = firstCompany.projects[0];
        router.push(`/planner?companyId=${firstCompany.id}&projectId=${firstProject.id}`);
        return;
      }
    }
    // Default: send all users to dashboard
    router.push('/dashboard');
  };

  const onSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Dev mode: auto-login
        if (data.devMode && data.userId) {
          console.log('[DEV MODE] Auto-logging in, code:', data.devOtpCode);
          const signInRes = await signIn('credentials', {
            email,
            password: '__OTP_VERIFIED__' + data.userId,
            redirect: false
          });
          
          if (signInRes?.ok) {
            await handleUserRedirect();
          } else {
            await handleUserRedirect();
          }
          return;
        }
        
        // Production: show code input
        setOtpSent(true);
      } else {
        setError(data.error || 'Failed to send code');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode }),
      });

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error('Failed to parse verify-otp response:', parseError);
        setError('Server error occurred. Please try again.');
        return;
      }

      if (res.ok && data.user) {
        // Create session via otp-session endpoint
        const sessionRes = await fetch('/api/auth/otp-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.user.email, userId: data.user.id }),
        });
        
        if (sessionRes.ok) {
          // Now use NextAuth's signIn to create the actual session
          // We'll use a special credential that bypasses password check for OTP
          const signInRes = await signIn('credentials', {
            email: data.user.email,
            password: '__OTP_VERIFIED__' + data.user.id,
            redirect: false
          });
          
          if (signInRes?.ok) {
            await handleUserRedirect();
          } else {
            // If NextAuth fails, just redirect anyway since OTP was verified
            await handleUserRedirect();
          }
        } else {
          setError('Failed to create session');
        }
      } else {
        setError(data.error || 'Invalid code');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gh-hero-gradient p-4">
      <div className="bg-[#1a2332] border border-white/10 rounded-lg p-8 w-full max-w-md space-y-6 shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 gh-icon-wrapper rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-slate-400 mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            {successMessage}
          </div>
        )}
        
        <div className="space-y-4">
            {!otpSent ? (
              <form onSubmit={onSendOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" 
                    placeholder="you@example.com"
                    required 
                  />
                  <p className="text-xs text-slate-400 mt-2">We'll send a sign-in code to your email</p>
                </div>
                <button 
                  type="submit" 
                  className="w-full gh-cta-button px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending code...' : 'Send Sign-In Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={onVerifyOtp} className="space-y-5">
                <div className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="font-medium mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Code sent!
                  </p>
                  <p className="text-xs text-green-300">Check your email and enter the code below.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Verification Code</label>
                  <input 
                    type="text" 
                    value={otpCode} 
                    onChange={(e) => {
                      if (error) setError(null);
                      let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                      if (value.length === 4 && !value.includes('-')) {
                        value = value + '-';
                      }
                      value = value.replace(/--+/g, '-');
                      if (value.length > 9) {
                        value = value.slice(0, 9);
                      }
                      setOtpCode(value);
                    }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" 
                    placeholder="XXXX-XXXX"
                    required 
                    maxLength={9}
                    autoFocus
                  />
                  <p className="text-xs text-slate-400 mt-2">Code sent to {email}</p>
                </div>
                <button 
                  type="submit" 
                  className="w-full gh-cta-button px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
                  disabled={isSubmitting || otpCode.length !== 9 || !otpCode.includes('-')}
                >
                  {isSubmitting ? 'Verifying...' : 'Verify and Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                    setError(null);
                  }}
                  className="w-full px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
                >
                  ← Use different email
                </button>
              </form>
            )}
          </div>
        
        <div className="text-sm text-slate-400 text-center pt-4 border-t border-white/10">
          Don't have an account?{' '}
          <a className="text-orange-400 hover:text-orange-300 font-medium transition-colors" href="/signup">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}

