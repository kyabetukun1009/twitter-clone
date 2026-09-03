import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const GATE_COOKIE = 'yajuter_gate';

// Single-user gate: everything except /gate, the gate API and
// static assets requires the gate cookie. The cookie value is the
// gate password itself (httpOnly + secure + strict SameSite);
// acceptable for a personal single-user app behind Vercel env secrets.
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (
    pathname === '/gate' ||
    pathname === '/api/yajuter/gate' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/fonts/') ||
    pathname === '/favicon.ico' ||
    pathname === '/site.webmanifest' ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|mp4|webmanifest)$/)
  )
    return NextResponse.next();

  const expected = process.env.YAJUTER_GATE_PASSWORD;
  // Next 12.2+: cookies.get() returns { name, value }; older Map shape
  // returns the string directly. Handle both.
  const raw = req.cookies.get(GATE_COOKIE) as unknown;
  const cookie =
    typeof raw === 'string'
      ? raw
      : (raw as { value?: string } | undefined)?.value;

  if (expected && cookie === expected) return NextResponse.next();

  // /api/yajuter/* enforces the gate itself (401 JSON) so the
  // Middleware lets it pass through untouched.
  if (pathname.startsWith('/api/yajuter/') && pathname !== '/api/yajuter/gate')
    return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/gate';
  return NextResponse.redirect(url);
}
