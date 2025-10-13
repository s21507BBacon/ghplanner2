// Custom NextAuth adapter for Neon PostgreSQL database
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from 'next-auth/adapters';
import type { Database } from './db';
import { DbHelpers, dateToTimestamp, timestampToDate } from './db';

export function DatabaseAdapter(db: Database): Adapter {
  const helpers = new DbHelpers(db);

  return {
    async createUser(user: Omit<AdapterUser, 'id'>): Promise<AdapterUser> {
      const id = crypto.randomUUID();
      const now = dateToTimestamp(new Date());

      await helpers.insert('users', {
        id,
        email: user.email,
        name: user.name || null,
        email_verified: user.emailVerified ? true : false,
        created_at: now,
        updated_at: now
      });

      return {
        id,
        email: user.email,
        emailVerified: user.emailVerified || null,
        name: user.name || null
      };
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const user = await helpers.findOne('users', { id });
      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified ? new Date() : null,
        name: user.name
      };
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const user = await helpers.findOne('users', { email });
      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified ? new Date() : null,
        name: user.name
      };
    },

    async getUserByAccount({ providerAccountId, provider }): Promise<AdapterUser | null> {
      const account = await helpers.findOne('accounts', {
        provider,
        provider_account_id: providerAccountId
      });

      if (!account) return null;

      const user = await helpers.findOne('users', { id: account.user_id });
      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified ? new Date() : null,
        name: user.name
      };
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>): Promise<AdapterUser> {
      const data: any = {
        updated_at: dateToTimestamp(new Date())
      };

      if (user.email !== undefined) data.email = user.email;
      if (user.name !== undefined) data.name = user.name;
      if (user.emailVerified !== undefined) {
        data.email_verified = user.emailVerified ? true : false;
      }

      await helpers.update('users', { id: user.id }, data);

      const updated = await helpers.findOne('users', { id: user.id });
      if (!updated) throw new Error('User not found after update');

      return {
        id: updated.id,
        email: updated.email,
        emailVerified: updated.email_verified ? new Date() : null,
        name: updated.name
      };
    },

    async deleteUser(userId: string): Promise<void> {
      await helpers.delete('users', { id: userId });
    },

    async linkAccount(account: AdapterAccount): Promise<void> {
      await helpers.insert('accounts', {
        id: crypto.randomUUID(),
        user_id: account.userId,
        type: account.type,
        provider: account.provider,
        provider_account_id: account.providerAccountId,
        refresh_token: account.refresh_token || null,
        access_token: account.access_token || null,
        expires_at: account.expires_at || null,
        token_type: account.token_type || null,
        scope: account.scope || null,
        id_token: account.id_token || null,
        session_state: account.session_state || null
      });
    },

    async unlinkAccount({ providerAccountId, provider }): Promise<void> {
      await helpers.delete('accounts', {
        provider,
        provider_account_id: providerAccountId
      });
    },

    async createSession(session: { sessionToken: string; userId: string; expires: Date }): Promise<AdapterSession> {
      await helpers.insert('sessions', {
        id: crypto.randomUUID(),
        session_token: session.sessionToken,
        user_id: session.userId,
        expires: dateToTimestamp(session.expires)
      });

      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires
      };
    },

    async getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const session = await helpers.findOne('sessions', { session_token: sessionToken });
      if (!session) return null;

      const expiresDate = timestampToDate(session.expires);
      if (!expiresDate || expiresDate < new Date()) {
        await helpers.delete('sessions', { session_token: sessionToken });
        return null;
      }

      const user = await helpers.findOne('users', { id: session.user_id });
      if (!user) return null;

      return {
        session: {
          sessionToken: session.session_token,
          userId: session.user_id,
          expires: expiresDate
        },
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified ? new Date() : null,
          name: user.name
        }
      };
    },

    async updateSession(session: Partial<AdapterSession> & Pick<AdapterSession, 'sessionToken'>): Promise<AdapterSession | null | undefined> {
      const data: any = {};
      if (session.expires) data.expires = dateToTimestamp(session.expires);
      if (session.userId) data.user_id = session.userId;

      await helpers.update('sessions', { session_token: session.sessionToken }, data);

      const updated = await helpers.findOne('sessions', { session_token: session.sessionToken });
      if (!updated) return null;

      return {
        sessionToken: updated.session_token,
        userId: updated.user_id,
        expires: timestampToDate(updated.expires)!
      };
    },

    async deleteSession(sessionToken: string): Promise<void> {
      await helpers.delete('sessions', { session_token: sessionToken });
    },

    async createVerificationToken(token: VerificationToken): Promise<VerificationToken | null | undefined> {
      await helpers.insert('verification_tokens', {
        identifier: token.identifier,
        token: token.token,
        expires: dateToTimestamp(token.expires)
      });

      return token;
    },

    async useVerificationToken({ identifier, token }: { identifier: string; token: string }): Promise<VerificationToken | null> {
      const verificationToken = await helpers.findOne('verification_tokens', { identifier, token });
      if (!verificationToken) return null;

      await helpers.delete('verification_tokens', { identifier, token });

      const expiresDate = timestampToDate(verificationToken.expires);
      if (!expiresDate) return null;

      return {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
        expires: expiresDate
      };
    }
  };
}

