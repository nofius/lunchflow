import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Only protect /scan routes (page + API)
  if (!pathname.startsWith('/scan')) {
    return NextResponse.next()
  }

  const staffKey = process.env.STAFF_KEY
  if (!staffKey) {
    // If STAFF_KEY is not set, allow all access (dev mode)
    return NextResponse.next()
  }

  // Check URL param first, then cookie
  const keyFromUrl = searchParams.get('key')
  const keyFromCookie = request.cookies.get('staff_key')?.value

  if (keyFromUrl === staffKey) {
    // Valid key in URL — set cookie so they don't need it again
    const response = NextResponse.redirect(new URL(pathname, request.url))
    response.cookies.set('staff_key', staffKey, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return response
  }

  if (keyFromCookie === staffKey) {
    return NextResponse.next()
  }

  // No valid key — block access
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export const config = {
  matcher: ['/scan/:path*'],
}
