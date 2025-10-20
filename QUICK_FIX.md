# Quick Fix for Cloudflare Authentication Error

## Problem
Getting "Unauthorized" error when logging into ghplanner.com on Cloudflare Pages deployment.

## Root Cause
Missing environment variables in Cloudflare Pages configuration.

## Immediate Fix

### Step 1: Set Environment Variables in Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to: **Pages** → **ghplanner** → **Settings** → **Environment variables**
3. Add these **REQUIRED** variables for **Production**:

```
DATABASE_URL=postgresql://[your-neon-connection-string]
NEXTAUTH_SECRET=[generate-with-openssl-rand-base64-32]
NEXTAUTH_URL=https://ghplanner.com
RESEND_API_KEY=[your-resend-api-key]
EMAIL_FROM=GitHub Planner <noreply@ghplanner.com>
NODE_ENV=production
APP_URL=https://ghplanner.com
```

### Step 2: Generate NEXTAUTH_SECRET

Run this command locally to generate a secure secret:
```bash
openssl rand -base64 32
```

Copy the output and use it as your `NEXTAUTH_SECRET` value.

### Step 3: Get Database Connection String

1. Go to your [Neon Dashboard](https://console.neon.tech)
2. Select your project
3. Copy the connection string (should look like: `postgresql://user:pass@host/db?sslmode=require`)
4. Use this as your `DATABASE_URL` value

### Step 4: Get Resend API Key

1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Create a new API key
3. Use this as your `RESEND_API_KEY` value
4. Ensure your domain is verified in Resend

### Step 5: Redeploy

After adding all environment variables:
1. Go to **Deployments** tab in Cloudflare Pages
2. Click **Retry deployment** on the latest deployment
   - OR push a new commit to trigger a rebuild

### Step 6: Verify

Once redeployed, test:
1. Visit: `https://ghplanner.com/api/health?detailed=true`
2. Check that all environment variables show as "Set"
3. Try logging in again

## Optional: GitHub OAuth Setup

If you want GitHub OAuth login:

```
GITHUB_CLIENT_ID=[your-github-oauth-client-id]
GITHUB_CLIENT_SECRET=[your-github-oauth-client-secret]
GITHUB_TOKEN=[your-github-personal-access-token]
```

Create OAuth app at: https://github.com/settings/developers
- Callback URL: `https://ghplanner.com/api/auth/callback/github`

## Troubleshooting

### Still getting errors after setting variables?
1. Make sure you saved the variables in Cloudflare
2. Ensure you redeployed AFTER adding variables
3. Check Cloudflare Pages function logs for specific errors
4. Verify database connection string is correct and accessible

### Database connection issues?
- Ensure connection string includes `?sslmode=require`
- Verify Neon database is not paused
- Check that Cloudflare Workers can access your database

### Email not sending?
- Verify domain is verified in Resend
- Check `EMAIL_FROM` matches a verified domain
- Review Resend logs for delivery issues

## Need More Help?

See full documentation: [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md)
