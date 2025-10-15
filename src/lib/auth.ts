import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import { getDatabase } from './database';
import { DbHelpers, dateToTimestamp } from './db';
import * as webCryptoJwt from './jwt-web-crypto';

export const authOptions: NextAuthOptions = {
  // Don't use adapter with JWT strategy - causes Node.js crypto issues in Cloudflare Workers
  session: { 
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  pages: {
    signIn: '/signin',
  },
  // Use Web Crypto API for JWT encoding/decoding (Cloudflare Workers compatible)
  jwt: {
    encode: webCryptoJwt.encode,
    decode: webCryptoJwt.decode,
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          console.log('[AUTH] Authorize called with:', { 
            email: credentials?.email, 
            passwordPrefix: credentials?.password?.substring(0, 20),
            hasEmail: !!credentials?.email,
            hasPassword: !!credentials?.password
          });

          if (!credentials?.email || !credentials?.password) {
            console.log('[AUTH] Missing credentials');
            return null;
          }

          console.log('[AUTH] Getting database connection...');
          const db = getDatabase();
          if (!db) {
            console.error('[AUTH] Database connection failed - no database instance');
            return null;
          }
          console.log('[AUTH] Database connection successful');

          console.log('[AUTH] Creating database helpers...');
          const helpers = new DbHelpers(db);

          console.log('[AUTH] Finding user by email:', credentials.email);
          let user;
          try {
            user = await helpers.findOne('users', { email: credentials.email });
          } catch (dbError) {
            console.error('[AUTH] Database query error:', dbError);
            return null;
          }

          if (!user) {
            console.log('[AUTH] User not found:', credentials.email);
            return null;
          }

          console.log('[AUTH] User found:', { 
            id: user.id, 
            email: user.email, 
            emailVerified: user.email_verified,
            name: user.name 
          });

          // Check for OTP verification (special password from OTP flow)
          if (credentials.password.startsWith('__OTP_VERIFIED__')) {
            const userId = credentials.password.replace('__OTP_VERIFIED__', '');
            console.log('[AUTH] OTP verification attempt:', { 
              expectedUserId: userId, 
              actualUserId: user.id, 
              idsMatch: user.id === userId,
              emailVerified: user.email_verified 
            });

            if (user.id === userId && user.email_verified) {
              console.log('[AUTH] OTP verification successful - returning user');
              return {
                id: user.id,
                email: user.email,
                name: user.name || undefined,
              };
            }
            console.log('[AUTH] OTP verification failed - ID mismatch or email not verified');
            return null;
          }

          console.log('[AUTH] No OTP verification token, rejecting');
          // No password-based login - only OTP
          return null;
        } catch (error) {
          console.error('[AUTH] Authorize error:', error);
          console.error('[AUTH] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          console.error('[AUTH] Error details:', {
            message: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.name : typeof error
          });
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        console.log('[AUTH] SignIn callback:', { provider: account?.provider, userId: user.id });
        
        // Handle GitHub OAuth sign-in
        if (account?.provider === 'github') {
          const db = getDatabase();
          const helpers = new DbHelpers(db);
          
          // Find or create user by email
          let dbUser = await helpers.findOne('users', { email: user.email });
          
          if (!dbUser) {
            // Create new user for GitHub OAuth
            const now = Date.now();
            dbUser = {
              id: crypto.randomUUID(),
              email: user.email!,
              name: user.name || (profile as any)?.login || 'GitHub User',
              email_verified: true,
              github_access_token: account.access_token,
              github_refresh_token: account.refresh_token,
              github_username: (profile as any)?.login,
              github_connected_at: dateToTimestamp(new Date()),
              created_at: dateToTimestamp(new Date(now)),
              updated_at: dateToTimestamp(new Date(now)),
            };
            await helpers.insert('users', dbUser);
            console.log('[AUTH] Created new user via GitHub OAuth:', dbUser.id);
          } else {
            // Update existing user with GitHub tokens
            await helpers.update('users', { id: dbUser.id }, {
              github_access_token: account.access_token,
              github_refresh_token: account.refresh_token,
              github_username: (profile as any)?.login,
              github_connected_at: dateToTimestamp(new Date()),
              updated_at: dateToTimestamp(new Date()),
            });
            console.log('[AUTH] Updated existing user with GitHub OAuth:', dbUser.id);
          }
          
          // Store user ID for JWT callback
          (user as any).id = dbUser.id;
        }
        
        return true;
      } catch (error) {
        console.error('[AUTH] SignIn callback error:', error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      try {
        console.log('[AUTH] JWT callback called:', { hasUser: !!user, hasToken: !!token, hasAccount: !!account });
        if (user) {
          token.userId = (user as any).id || token.sub;
          console.log('[AUTH] JWT callback: set userId:', token.userId);
        }
        if (account?.access_token) {
          token.accessToken = account.access_token;
        }
        // activeCompanyId can be set via a separate endpoint later
        return token;
      } catch (error) {
        console.error('[AUTH] JWT callback error:', error);
        throw error;
      }
    },
    async session({ session, token }) {
      try {
        console.log('[AUTH] Session callback called:', { hasSession: !!session, hasToken: !!token });
        (session as any).userId = token.userId;
        (session as any).activeCompanyId = (token as any).activeCompanyId || null;
        (session as any).accessToken = token.accessToken;
        console.log('[AUTH] Session callback: set userId:', (session as any).userId);
        return session;
      } catch (error) {
        console.error('[AUTH] Session callback error:', error);
        throw error;
      }
    }
  }
};

