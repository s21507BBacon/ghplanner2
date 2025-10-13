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
    router.push('/onboarding');
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white border border-slate-200 rounded-lg p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="text-green-600 text-sm bg-green-50 border border-green-200 rounded p-3">
            {successMessage}
          </div>
        )}
        
        <div className="space-y-4">
            {!otpSent ? (
              <form onSubmit={onSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg" 
                    required 
                  />
                  <p className="text-xs text-slate-500 mt-1">We'll send a sign-in code to your email</p>
                </div>
                <button 
                  type="submit" 
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending code...' : 'Send code'}
                </button>
              </form>
            ) : (
              <form onSubmit={onVerifyOtp} className="space-y-4">
                <div className="text-green-700 text-sm bg-green-50 border border-green-200 rounded p-3 mb-3">
                  <p className="font-medium mb-1">✓ Code sent!</p>
                  <p className="text-xs">Check your email and enter the code below.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enter code</label>
                  <input 
                    type="text" 
                    value={otpCode} 
                    onChange={(e) => {
                      // Clear any errors when user starts typing
                      if (error) setError(null);
                      // Allow alphanumeric and dash, convert to uppercase
                      let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                      // Auto-insert dash after 4 characters
                      if (value.length === 4 && !value.includes('-')) {
                        value = value + '-';
                      }
                      // Remove extra dashes
                      value = value.replace(/--+/g, '-');
                      // Limit to format: XXXX-XXXX
                      if (value.length > 9) {
                        value = value.slice(0, 9);
                      }
                      setOtpCode(value);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center text-xl font-mono tracking-wider" 
                    placeholder="1A2B-3C4D"
                    required 
                    maxLength={9}
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-1">Code sent to {email}</p>
                </div>
                <button 
                  type="submit" 
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={isSubmitting || otpCode.length !== 9 || !otpCode.includes('-')}
                >
                  {isSubmitting ? 'Verifying...' : 'Verify and sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                    setError(null);
                  }}
                  className="w-full px-4 py-2 text-slate-600 hover:text-slate-900 text-sm"
                >
                  ← Use different email
                </button>
              </form>
            )}
          </div>
        
        <div className="text-sm text-slate-600 text-center">
          No account? <a className="text-blue-600 hover:text-blue-700" href="/signup">Sign up</a>
        </div>
      </div>
    </div>
  );
}

