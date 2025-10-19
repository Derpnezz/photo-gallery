
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiting (for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 100; // requests per window

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const now = Date.now();
  const rateLimitData = rateLimitMap.get(ip);

  if (!rateLimitData || now > rateLimitData.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    rateLimitData.count++;
    
    if (rateLimitData.count > MAX_REQUESTS) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  // Block common attack patterns
  const path = request.nextUrl.pathname.toLowerCase();
  const suspiciousPatterns = [
    '/.env', '/phpinfo', '/.aws', '/credentials',
    '/.git', '/config', '/backup', '/.bak',
    '/admin', '/wp-admin', '/phpmyadmin'
  ];

  if (suspiciousPatterns.some(pattern => path.includes(pattern))) {
    console.warn(`🚨 Blocked suspicious request from ${ip}: ${path}`);
    return new NextResponse('Forbidden', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
