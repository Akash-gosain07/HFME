import { NextResponse } from 'next/server';

import { getServerSession } from '@/lib/auth';

export async function requireSession() {
  const session = await getServerSession();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
    };
  }

  return { session, response: null };
}

export async function requireAdmin() {
  const result = await requireSession();
  if (result.response) {
    return result;
  }

  if (result.session?.role !== 'admin') {
    return {
      session: null,
      response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }),
    };
  }

  return result;
}
