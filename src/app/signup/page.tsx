"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (res.ok) {
        setShowVerification(true);
        setError(null);
        // Store dev code if provided (development mode)
        if (data.devCode) {
          setDevCode(data.devCode);
        }
      } else {
        setError(data.error || 'Failed to sign up');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isVerifying) return;

    setError(null);
    setIsVerifying(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const data = await res.json().catch(() => ({} as any));
      
      if (res.ok) {
        // Email verified successfully, redirect to signin
        router.push('/signin?verified=true');
      } else {
        setError(data.error || 'Failed to verify code');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsVerifying(false);
    }
  };

  const resendCode = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json().catch(() => ({} as any));
      
      if (res.ok) {
        setError(null);
        // Update dev code if provided
        if (data.devCode) {
          setDevCode(data.devCode);
        }
        alert(data.devCode ? 'Dev code: ' + data.devCode : 'New verification code sent to your email!');
      } else {
        setError(data.error || 'Failed to resend code');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gh-hero-gradient p-4">
      <div className="bg-[#1a2332] border border-white/10 rounded-lg p-8 w-full max-w-md space-y-6 shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 gh-icon-wrapper green rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">
            {showVerification ? 'Verify Your Email' : 'Create Account'}
          </h1>
          <p className="text-slate-400 mt-2">
            {showVerification ? 'Enter the code we sent to your email' : 'Join GH Planner today'}
          </p>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            {error}
          </div>
        )}

        {!showVerification ? (
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                placeholder="John Doe"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                placeholder="you@example.com"
                required 
              />
              <p className="text-xs text-slate-400 mt-2">We&apos;ll send a verification code to your email</p>
            </div>
            <button
              type="submit"
              className="w-full gh-cta-button-secondary px-4 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending code...' : 'Create Account'}
            </button>
            <div className="text-sm text-slate-400 text-center pt-4 border-t border-white/10">
              Already have an account?{' '}
              <a className="text-green-400 hover:text-green-300 font-medium transition-colors" href="/signin">
                Sign in
              </a>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            {devCode ? (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 text-sm text-orange-400">
                <p className="font-medium mb-2">
                  🔧 Development Mode
                </p>
                <p className="text-xs text-orange-300 mb-2">Email sending is disabled. Use this code to verify:</p>
                <p className="text-white font-mono text-2xl font-bold text-center py-2 bg-orange-500/20 rounded">{devCode}</p>
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-sm text-green-400">
                <p className="font-medium mb-1">
                  We&apos;ve sent a verification code to
                </p>
                <p className="text-white font-semibold">{email}</p>
                <p className="text-xs text-green-300 mt-2">Please enter it below to verify your account.</p>
              </div>
            )}

            <form onSubmit={onVerifyCode} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
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
                    setVerificationCode(value);
                  }}
                  placeholder="XXXX-XXXX"
                  maxLength={9}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-center text-2xl tracking-widest focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                  required
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Enter the 8-character code from your email
                </p>
              </div>

              <button
                type="submit"
                className="w-full gh-cta-button-secondary px-4 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                disabled={isVerifying || verificationCode.length !== 9}
              >
                {isVerifying ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <div className="flex items-center justify-between text-sm pt-4 border-t border-white/10">
              <button
                onClick={() => setShowVerification(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ← Change email
              </button>
              <button
                onClick={resendCode}
                disabled={isSubmitting}
                className="text-green-400 hover:text-green-300 disabled:opacity-50 transition-colors"
              >
                Resend code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
