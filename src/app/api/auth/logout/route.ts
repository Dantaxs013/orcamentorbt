import { NextRequest, NextResponse } from 'next/server';
import {
  destroySession,
  SESSION_COOKIE_NAME,
  USER_META_COOKIE_NAME,
  LEGACY_SESSION_COOKIE_NAME,
} from '@/lib/session';

export async function POST(req: NextRequest) {
  const token =
    req.cookies.get(SESSION_COOKIE_NAME)?.value ||
    req.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value;

  if (token) {
    await destroySession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(USER_META_COOKIE_NAME);
  response.cookies.delete(LEGACY_SESSION_COOKIE_NAME);
  return response;
}
