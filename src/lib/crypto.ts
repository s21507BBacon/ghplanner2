import crypto from 'crypto';

const SECRET = (process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '').slice(0, 32).padEnd(32, '0');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(SECRET), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(SECRET), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

