import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getDatabase } from './database';
import { DbHelpers } from './db';
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
    async jwt({ token, user }) {
      try {
        console.log('[AUTH] JWT callback called:', { hasUser: !!user, hasToken: !!token });
        if (user) {
          token.userId = (user as any).id || token.sub;
          console.log('[AUTH] JWT callback: set userId:', token.userId);
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
        console.log('[AUTH] Session callback: set userId:', (session as any).userId);
        return session;
      } catch (error) {
        console.error('[AUTH] Session callback error:', error);
        throw error;
      }
    }
  }
};

