"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (res.ok) {
        // Dev mode: auto-login
        if (data.devMode && data.userId) {
          console.log('[DEV MODE] Auto-verifying user, code:', data.devOtpCode);
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
        setCodeSent(true);
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to sign up');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyCode = async (e: React.FormEvent) => {
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
      
      const data = await res.json();
      
      if (res.ok && data.user) {
        // Sign in with the verified user
        const signInRes = await signIn('credentials', {
          email: data.user.email,
          password: '__OTP_VERIFIED__' + data.user.id,
          redirect: false
        });
        
        if (signInRes?.ok || signInRes?.error === 'CredentialsSignin') {
          await handleUserRedirect();
        } else {
          await handleUserRedirect();
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
        <h1 className="text-xl font-semibold text-slate-900">Create account</h1>
        
        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}
        
        {codeSent ? (
          <div className="space-y-4">
            <div className="text-green-700 text-sm bg-green-50 border border-green-200 rounded p-3">
              <p className="font-medium mb-1">✓ Code sent!</p>
              <p className="text-xs">Check your email for the verification code.</p>
            </div>
            <form onSubmit={onVerifyCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Enter code</label>
                <input 
                  type="text" 
                  value={otpCode} 
                  onChange={(e) => {
                    // Clear any errors when user starts typing
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
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={isSubmitting || otpCode.length !== 9 || !otpCode.includes('-')}
              >
                {isSubmitting ? 'Verifying...' : 'Verify and create account'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setOtpCode('');
                  setError(null);
                  setSuccess(false);
                }}
                className="w-full px-4 py-2 text-slate-600 hover:text-slate-900 text-sm"
              >
                ← Use different email
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
              <p className="text-xs text-slate-500 mt-1">We'll send a verification code to your email</p>
            </div>
            <button 
              type="submit" 
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending code...' : 'Continue'}
            </button>
            <div className="text-sm text-slate-600">Already have an account? <a className="text-blue-600" href="/signin">Sign in</a></div>
          </form>
        )}
      </div>
    </div>
  );
}

