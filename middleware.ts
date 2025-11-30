import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting storage
const rateLimitMap = new Map()

export function middleware(request: NextRequest) {
  const { nextUrl, method } = request
  const pathname = nextUrl.pathname
  const searchParams = nextUrl.searchParams.toString().toLowerCase()

  const forwardedFor = request.headers.get('x-forwarded-for');
  let ip = null
  if (forwardedFor) {
    ip = forwardedFor.split(',')[0].trim();
  }

  // ALLOWED HTTP METHODS - Only GET is allowed for most routes
  const allowedMethods = ['GET', 'HEAD', 'OPTIONS']

  // Define allowed routes that can use GET
  const allowedGetRoutes = [
    '/gallery/',
    '/api/media/',
    '/',
    '/api/gallery/'
  ]
  
  // Check if this is an allowed GET route
  const isAllowedRoute = allowedGetRoutes.some(route => 
    pathname.startsWith(route)
  )

  // BLOCK ALL NON-GET REQUESTS (except OPTIONS and HEAD)
  if (!allowedMethods.includes(method)) {
    console.log(`🚨 Blocked ${method} request: ${ip} - ${method} ${pathname}`)
    return new NextResponse('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': 'GET, HEAD, OPTIONS'
      }
    })
  }

  // BLOCK GET REQUESTS to non-allowed routes (only allow /gallery/ and /api/media/)
  if (method === 'GET' && !isAllowedRoute && pathname !== '/') {
    console.log(`🚨 Blocked GET request to non-allowed route: ${ip} - ${method} ${pathname}`)
    return new NextResponse('Not Found', { status: 404 })
  }
  
  // BLOCK ALL REQUESTS WITH QUERY STRINGS (except ?slug= for allowed routes)
  if (searchParams.length > 0) {
    // Only allow query strings on allowed routes
    if (isAllowedRoute || pathname === '/') {
      // Check if query string contains only allowed parameters
      const allowedParams = ['slug']
      const queryParams = Array.from(nextUrl.searchParams.keys())

      const hasOnlyAllowedParams = queryParams.every(param =>
        allowedParams.includes(param.toLowerCase())
      )

      // Allow multiple slug parameters (for nested routes like /gallery/northwest-xc/2025?slug=northwest-xc&slug=2025)
      const hasOnlySlugParams = queryParams.every(param => param.toLowerCase() === 'slug')

      if (!hasOnlyAllowedParams || !hasOnlySlugParams) {
        console.log(`🚨 Blocked request with query string: ${ip} - ${method} ${pathname}?${searchParams}`)
        return new NextResponse('Not Found', { status: 404 })
      }
    } else {
      // Block all query strings on non-allowed routes
      console.log(`🚨 Blocked request with query string: ${ip} - ${method} ${pathname}?${searchParams}`)
      return new NextResponse('Not Found', { status: 404 })
    }
  }

  // Skip middleware for static files (they are still accessible)
  if (
    // Static assets
    pathname.startsWith('/_next/') ||
    pathname.includes('/_next/static/') ||
    pathname.includes('/_next/image/') ||

    // Image files
    pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|bmp)$/i) ||

    // Font files
    pathname.match(/\.(woff|woff2|eot|ttf|otf)$/i) ||

    // CSS and JS files
    pathname.match(/\.(css|js)$/i) ||

    // Favicon and manifest
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json'
  ) {
    return NextResponse.next()
  }

  // Security: Block common attack patterns
  const attackPatterns = [
    /\.env/,
    /\.git/,
    /\.ssh/,
    /wp-admin/,
    /phpinfo/,
    /config\./,
    /backup/,
    /\.\.\//, // Path traversal
    /union.*select/i, // SQL injection
    /phpinfo/,
    /php/,
    /redirect/,
    /search/,
  ]

  const isAttack = attackPatterns.some(pattern =>
    pattern.test(pathname.toLowerCase())
  )

  if (isAttack) {
    console.log(`🚨 Blocked attack attempt: ${ip} - ${method} ${pathname}`)
    return new NextResponse('Not Found', { status: 404 })
  }

  // Rate limiting only for allowed routes
  if (isAllowedRoute || pathname === '/') {
    const now = Date.now()
    const windowMs = 15 * 60 * 1000 // 15 minutes
    const maxRequests = 10000 // Generous limit for normal browsing

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, {
        count: 1,
        lastReset: now
      })
    } else {
      const userData = rateLimitMap.get(ip)

      // Reset counter if window has passed
      if (now - userData.lastReset > windowMs) {
        userData.count = 1
        userData.lastReset = now
      } else {
        userData.count += 1
      }

      rateLimitMap.set(ip, userData)

      // Check if over limit
      if (userData.count > maxRequests) {
        console.log(`🚨 Rate limit exceeded: ${ip} - ${method} ${pathname}`)
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'Retry-After': `${Math.ceil((userData.lastReset + windowMs - now) / 1000)}`
          }
        })
      }
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next()

  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Only set these on HTML pages, not on API/file responses
  if ((isAllowedRoute || pathname === '/') && !pathname.match(/\.(js|css|json|xml)$/)) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; object-src 'none'"
    )
  }

  return response
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|gif|webp|svg|ico|bmp|woff|woff2|eot|ttf|otf|css|js|json|xml)$).*)',
  ],
}
