import type { NextRequest } from 'next/server';

import type { AuthSession } from '@/lib/live-types';

export const SESSION_COOKIE_NAME = 'hfme_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function getAuthSecret() {
  return process.env.AUTH_SECRET || 'hfme-local-auth-secret';
}

function encodeBase64Url(input: Uint8Array) {
  let binary = '';
  input.forEach((value) => {
    binary += String.fromCharCode(value);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getAuthSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signSession(session: AuthSession) {
  const payload = new TextEncoder().encode(JSON.stringify(session));
  const key = await getSigningKey();
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, payload));
  return `${encodeBase64Url(payload)}.${encodeBase64Url(signature)}`;
}

export async function verifySessionToken(token?: string | null): Promise<AuthSession | null> {
  if (!token) {
    return null;
  }

  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) {
    return null;
  }

  try {
    const payload = decodeBase64Url(payloadPart);
    const signature = decodeBase64Url(signaturePart);
    const key = await getSigningKey();
    const isValid = await crypto.subtle.verify('HMAC', key, signature, payload);

    if (!isValid) {
      return null;
    }

    const session = JSON.parse(new TextDecoder().decode(payload)) as AuthSession;

    if (!session.exp || session.exp < Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function buildSession(user: {
  id: string;
  email: string;
  role: string;
  name: string;
}): AuthSession {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    exp: Date.now() + SESSION_TTL_MS,
  };
}

export function getSessionCookieOptions() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production' && appUrl.startsWith('https://'),
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  };
}


export async function getRequestSession(request: Pick<NextRequest, 'headers'> | Request) {
  const cookieHeader = request.headers.get('cookie');

  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(';')
    .map((entry: string) => entry.trim())
    .find((entry: string) => entry.startsWith(`${SESSION_COOKIE_NAME}=`));

  return verifySessionToken(cookie?.split('=').slice(1).join('=') ?? null);
}
