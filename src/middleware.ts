import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Auth pre-filter + security headers (APP_BLUEPRINT §3, §12).
const PROTECTED = ["/dashboard", "/admin", "/portal"];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Security headers
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  // EVV needs geolocation; everything else denied.
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  // Don't cache authenticated app responses.
  const path = req.nextUrl.pathname;
  if (PROTECTED.some((p) => path.startsWith(p))) {
    res.headers.set("Cache-Control", "no-store, max-age=0");
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
