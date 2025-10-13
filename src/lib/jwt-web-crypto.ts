// Custom JWT encoding/decoding for Cloudflare Workers using Web Crypto API
import { SignJWT, jwtVerify } from 'jose';

const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

// Convert string secret to Uint8Array for Web Crypto API
function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function encode(params: {
  token?: any;
  secret: string;
  maxAge?: number;
}): Promise<string> {
  const { token = {}, secret, maxAge = DEFAULT_MAX_AGE } = params;
  
  const secretKey = getSecretKey(secret);
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT(token)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + maxAge)
    .sign(secretKey);
}

export async function decode(params: {
  token?: string;
  secret: string;
}): Promise<any | null> {
  const { token, secret } = params;
  
  if (!token) return null;
  
  try {
    const secretKey = getSecretKey(secret);
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    
    return payload;
  } catch (error) {
    console.error('[JWT] Decode error:', error);
    return null;
  }
}

