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
        if (!credentials?.email || !credentials?.password) return null;

        const db = getDatabase();
        const helpers = new DbHelpers(db);
        const user = await helpers.findOne('users', { email: credentials.email });
        if (!user) return null;

        // Check for OTP verification (special password from OTP flow)
        if (credentials.password.startsWith('__OTP_VERIFIED__')) {
          const userId = credentials.password.replace('__OTP_VERIFIED__', '');
          if (user.id === userId && user.email_verified) {
            return {
              id: user.id,
              email: user.email,
              name: user.name || undefined,
            };
          }
          return null;
        }

        // No password-based login - only OTP
        return null;
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

