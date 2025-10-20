import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Get hostname
  const hostname = request.headers.get('host') || 'localhost:3000';
  const subdomain = hostname.split('.')[0];
  
  // Handle docs subdomain
  if (subdomain === 'docs') {
    const url = request.nextUrl.clone();
    url.pathname = `/docs${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;
  
  // Management pages that require owner/admin access
  const managementPages = ['/dashboard', '/dashboard/members', '/dashboard/projects', '/companies'];
  
  // Check if accessing a management page
  const isManagementPage = managementPages.some(page => 
    path === page || path.startsWith(`${page}/`)
  );
  
  if (isManagementPage) {
    // Check user role from token or make API call
    // For now, we'll let the page handle the check and redirect
    // But we could add more robust checking here if needed
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public|.*\\..*|_next).*)',
  ]
};
