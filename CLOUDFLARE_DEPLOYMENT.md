# Cloudflare Pages Deployment Guide

## Required Environment Variables

To deploy ghplanner.com on Cloudflare Pages, you **must** configure the following environment variables in your Cloudflare Pages project settings:

### Database Configuration
- `DATABASE_URL` - Your Neon PostgreSQL connection string
  - Format: `postgresql://user:password@host/database?sslmode=require`
  - Get this from your Neon dashboard

### Authentication Configuration
- `NEXTAUTH_SECRET` - Secret key for NextAuth.js JWT signing
  - Generate with: `openssl rand -base64 32`
  - **CRITICAL**: Must be set or authentication will fail
  
- `JWT_SECRET` - Fallback JWT secret (optional if NEXTAUTH_SECRET is set)
  - Same format as NEXTAUTH_SECRET

- `NEXTAUTH_URL` - Full URL of your deployed site
  - Example: `https://ghplanner.com`
  - Used for OAuth callbacks and redirects

### Email Configuration (for OTP)
- `RESEND_API_KEY` - API key from Resend.com for sending emails
  - Get from: https://resend.com/api-keys
  
- `EMAIL_FROM` - Sender email address
  - Example: `GitHub Planner <noreply@ghplanner.com>`
  - Must be a verified domain in Resend

### GitHub Integration (Optional)
- `GITHUB_CLIENT_ID` - OAuth App Client ID
  - Create at: https://github.com/settings/developers
  
- `GITHUB_CLIENT_SECRET` - OAuth App Client Secret
  
- `GITHUB_TOKEN` - Personal Access Token for GitHub API
  - Scopes needed: `repo`, `read:user`, `user:email`

### Application Configuration
- `APP_URL` - Base URL of your application
  - Example: `https://ghplanner.com`
  
- `NODE_ENV` - Set to `production` for production deployments

## How to Set Environment Variables in Cloudflare Pages

1. Go to your Cloudflare Dashboard
2. Navigate to **Pages** → Select your project (`ghplanner`)
3. Go to **Settings** → **Environment variables**
4. Add each variable for the **Production** environment
5. Click **Save** after adding all variables
6. Redeploy your application for changes to take effect

## Verifying Your Deployment

After setting environment variables and redeploying, verify your setup:

1. **Check health endpoint**: Visit `https://ghplanner.com/api/health?detailed=true`
   - Should show all environment variables as "Set"
   - Database should be "connected"
   
2. **Test authentication**: Try logging in with OTP
   - Should receive verification email
   - Should be able to verify code and sign in

## Common Issues

### "Unauthorized" Error on Login
**Cause**: Missing `NEXTAUTH_SECRET` or `DATABASE_URL`
**Solution**: Ensure both are set in Cloudflare Pages environment variables

### Database Connection Failed
**Cause**: Invalid or missing `DATABASE_URL`
**Solution**: 
- Verify connection string format
- Ensure Neon database is accessible from Cloudflare Workers
- Check that connection string includes `?sslmode=require`

### OTP Emails Not Sending
**Cause**: Missing or invalid `RESEND_API_KEY`
**Solution**: 
- Verify API key is correct
- Ensure `EMAIL_FROM` domain is verified in Resend
- Check Resend dashboard for error logs

### GitHub OAuth Not Working
**Cause**: Incorrect OAuth callback URL or missing credentials
**Solution**:
- Set callback URL in GitHub OAuth app to: `https://ghplanner.com/api/auth/callback/github`
- Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
- Ensure `NEXTAUTH_URL` matches your domain

## Build Configuration

The project is configured to work with Cloudflare Pages using OpenNext:

- **Build command**: `npm run build` (or as configured in your package.json)
- **Build output directory**: `.open-next`
- **Node.js compatibility**: Enabled via `wrangler.toml`

## Deployment Checklist

- [ ] All required environment variables are set in Cloudflare Pages
- [ ] Database connection string is valid and accessible
- [ ] NEXTAUTH_SECRET is generated and set
- [ ] Email sending is configured with Resend
- [ ] Health check endpoint returns "healthy"
- [ ] Can successfully log in with OTP
- [ ] GitHub OAuth is working (if enabled)

## Support

If you continue to experience issues:
1. Check the health endpoint for detailed diagnostics
2. Review Cloudflare Pages function logs
3. Verify all environment variables are correctly set
4. Ensure database is accessible from Cloudflare Workers
