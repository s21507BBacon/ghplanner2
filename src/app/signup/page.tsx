"use client";
import { useState } from 'react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        alert('Success! Check your email for the verification code.');
      } else {
        setError(data.error || 'Failed to sign up');
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
        <h1 className="text-xl font-semibold text-slate-900">Create account</h1>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

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
      </div>
    </div>
  );
}
