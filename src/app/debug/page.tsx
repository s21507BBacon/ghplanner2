"use client";

import { useState, useEffect } from 'react';

interface HealthCheckResult {
  status: string;
  timestamp?: string;
  environment?: {
    NODE_ENV?: string;
    DATABASE_URL?: string;
    NEON_DATABASE_URL?: string;
    NEXTAUTH_SECRET?: string;
    JWT_SECRET?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    GITHUB_TOKEN?: string;
    APP_URL?: string;
  };
  cloudflare?: {
    context?: string;
    env?: string;
  };
  services?: {
    database?: string;
    api?: string;
  };
  error?: string;
  fullError?: string;
}

export default function DebugPage() {
  const [healthData, setHealthData] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/health?detailed=true');
      const data = await response.json();

      setHealthData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testOTPFlow = async () => {
    try {
      setError(null);

      // Test send-otp
      const sendResponse = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const sendData = await sendResponse.json();

      if (sendResponse.ok) {
        alert('OTP sent successfully! Check the logs for details.');
      } else {
        setError(`Send OTP failed: ${sendData.error}`);
      }
    } catch (err: any) {
      setError(`Send OTP error: ${err.message}`);
    }
  };

  const testVerifyOTP = async () => {
    try {
      setError(null);

      // Test verify-otp with a dummy code
      const verifyResponse = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', code: 'AAAA-BBBB' }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyResponse.ok) {
        alert('OTP verification successful!');
      } else {
        setError(`Verify OTP failed: ${verifyData.error}`);
      }
    } catch (err: any) {
      setError(`Verify OTP error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Debug Information</h1>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold">Error</h3>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">System Health</h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-600 mt-2">Checking system health...</p>
            </div>
          ) : healthData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  healthData.status === 'healthy' ? 'bg-green-100 text-green-800' :
                  healthData.status === 'unhealthy' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {healthData.status}
                </span>
              </div>

              {healthData.timestamp && (
                <div className="text-sm text-slate-600">
                  Last checked: {new Date(healthData.timestamp).toLocaleString()}
                </div>
              )}

              {healthData.environment && (
                <div>
                  <h3 className="font-medium mb-2">Environment Variables</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(healthData.environment).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-mono text-slate-600">{key}:</span>
                        <span className={value === 'Set' ? 'text-green-600' : value === 'Not set' ? 'text-red-600' : 'text-slate-900'}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {healthData.cloudflare && (
                <div>
                  <h3 className="font-medium mb-2">Cloudflare Context</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Context:</span>
                      <span className={healthData.cloudflare.context === 'available' ? 'text-green-600' : 'text-red-600'}>
                        {healthData.cloudflare.context}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Environment:</span>
                      <span className={healthData.cloudflare.env === 'available' ? 'text-green-600' : 'text-red-600'}>
                        {healthData.cloudflare.env}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {healthData.services && (
                <div>
                  <h3 className="font-medium mb-2">Services</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(healthData.services).map(([service, status]) => (
                      <div key={service} className="flex justify-between">
                        <span className="text-slate-600 capitalize">{service}:</span>
                        <span className={
                          status === 'connected' || status === 'operational' ? 'text-green-600' :
                          status === 'error' ? 'text-red-600' :
                          'text-yellow-600'
                        }>
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {healthData.error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <h4 className="text-red-800 font-medium">Error Details</h4>
                  <p className="text-red-700 text-sm mt-1">{healthData.error}</p>
                  {healthData.fullError && (
                    <details className="mt-2">
                      <summary className="text-red-600 text-sm cursor-pointer">Full error details</summary>
                      <pre className="text-xs text-red-800 mt-1 whitespace-pre-wrap">{healthData.fullError}</pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-600">No health data available</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">OTP Flow Testing</h2>
          <p className="text-sm text-slate-600 mb-4">
            Use these buttons to test the OTP authentication flow. Check the browser console and Cloudflare logs for detailed debugging information.
          </p>

          <div className="flex gap-3">
            <button
              onClick={testOTPFlow}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Test Send OTP
            </button>
            <button
              onClick={testVerifyOTP}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Test Verify OTP
            </button>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded text-sm">
            <p className="font-medium text-slate-700">Instructions:</p>
            <ol className="list-decimal list-inside mt-2 text-slate-600 space-y-1">
              <li>Click "Test Send OTP" to trigger email sending</li>
              <li>Check Cloudflare Pages logs for debugging output</li>
              <li>Use "Test Verify OTP" to test code verification (will fail with dummy code)</li>
              <li>Look for console logs showing database connections and email attempts</li>
            </ol>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Troubleshooting Guide</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-slate-900">Common Issues & Solutions</h3>
              <div className="mt-2 space-y-2 text-sm">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <strong>Database Connection Failed:</strong> Check that DATABASE_URL is set in Cloudflare Pages environment variables.
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <strong>Email Not Sending:</strong> Verify RESEND_API_KEY and EMAIL_FROM are configured in Cloudflare Pages.
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <strong>Cloudflare Context Not Available:</strong> This is expected in some deployment scenarios - ensure environment variables are set directly.
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <strong>Authentication Secret Missing:</strong> Set NEXTAUTH_SECRET or JWT_SECRET in Cloudflare Pages environment variables.
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-slate-900">Cloudflare Pages Environment Variables</h3>
              <p className="text-sm text-slate-600 mt-1">
                Go to your Cloudflare Pages dashboard → Your project → Settings → Environment variables
              </p>
              <div className="mt-2 p-3 bg-slate-50 rounded font-mono text-sm">
                DATABASE_URL=postgresql://user:pass@host/db?sslmode=require<br/>
                NEXTAUTH_SECRET=your-secure-secret-here<br/>
                RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx<br/>
                EMAIL_FROM=yourapp@yourdomain.com<br/>
                APP_URL=https://your-app.pages.dev
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
