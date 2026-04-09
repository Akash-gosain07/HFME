import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySessionToken } from './auth';

export async function getServerSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value);
}
