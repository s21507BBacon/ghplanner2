import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { DatabaseAdapter } from './auth-adapter';
import { getDatabase } from './database';
import { DbHelpers } from './db';

export const authOptions: NextAuthOptions = {
  adapter: DatabaseAdapter(getDatabase()) as any,
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  pages: {
    signIn: '/signin',
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
          console.log('[AUTH] Authorize called with:', { email: credentials?.email, passwordType: credentials?.password?.substring(0, 20) });

          if (!credentials?.email || !credentials?.password) {
            console.log('[AUTH] Missing credentials');
            return null;
          }

          console.log('[AUTH] Getting database connection...');
          const db = getDatabase();
          if (!db) {
            console.error('[AUTH] Database connection failed');
            return null;
          }

          console.log('[AUTH] Creating database helpers...');
          const helpers = new DbHelpers(db);

          console.log('[AUTH] Finding user by email:', credentials.email);
          const user = await helpers.findOne('users', { email: credentials.email });

          if (!user) {
            console.log('[AUTH] User not found:', credentials.email);
            return null;
          }

          console.log('[AUTH] User found:', { id: user.id, email: user.email, emailVerified: user.email_verified });

          // Check for OTP verification (special password from OTP flow)
          if (credentials.password.startsWith('__OTP_VERIFIED__')) {
            const userId = credentials.password.replace('__OTP_VERIFIED__', '');
            console.log('[AUTH] OTP verification attempt:', { expectedUserId: userId, actualUserId: user.id, emailVerified: user.email_verified });

            if (user.id === userId && user.email_verified) {
              console.log('[AUTH] OTP verification successful');
              return {
                id: user.id,
                email: user.email,
                name: user.name || undefined,
              };
            }
            console.log('[AUTH] OTP verification failed');
            return null;
          }

          console.log('[AUTH] No OTP verification, rejecting');
          // No password-based login - only OTP
          return null;
        } catch (error) {
          console.error('[AUTH] Authorize error:', error);
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as any).id || token.sub;
      }
      // activeCompanyId can be set via a separate endpoint later
      return token;
    },
    async session({ session, token }) {
      (session as any).userId = token.userId;
      (session as any).activeCompanyId = (token as any).activeCompanyId || null;
      return session;
    }
  }
};

