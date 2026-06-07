import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('auth')?.value
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    try {
      await verifyToken(token)
    } catch {
      const res = NextResponse.redirect(new URL('/login', req.url))
      res.cookies.delete('auth')
      return res
    }
  }

  if ((pathname === '/login' || pathname === '/register') && token) {
    try {
      await verifyToken(token)
      return NextResponse.redirect(new URL('/dashboard', req.url))
    } catch {
      // invalid token — let them through
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
}
