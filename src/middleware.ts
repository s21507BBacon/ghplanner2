import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
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
    '/dashboard/:path*',
    '/companies/:path*',
  ]
};
