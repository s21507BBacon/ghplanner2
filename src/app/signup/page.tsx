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
        alert('New verification code sent to your email!');
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white border border-slate-200 rounded-lg p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">
          {showVerification ? 'Verify your email' : 'Create account'}
        </h1>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        {!showVerification ? (
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
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
              We've sent a verification code to <strong>{email}</strong>. Please enter it below.
            </div>

            <form onSubmit={onVerifyCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  maxLength={9}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-center text-lg tracking-wider"
                  required
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter the 8-character code from your email
                </p>
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isVerifying}
              >
                {isVerifying ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => setShowVerification(false)}
                className="text-slate-600 hover:text-slate-900"
              >
                ← Change email
              </button>
              <button
                onClick={resendCode}
                disabled={isSubmitting}
                className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
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
