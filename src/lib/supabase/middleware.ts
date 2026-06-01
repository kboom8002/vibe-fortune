import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  // Check if the request is for /app routes
  if (request.nextUrl.pathname.startsWith("/app")) {
    // Check for any Supabase auth cookie or our custom auth storage
    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(
      c => c.name.includes("auth-token") || c.name.startsWith("sb-")
    );

    // If no auth cookie at all, redirect to sign-in
    // The client-side Supabase SDK will handle detailed auth verification
    if (!hasAuthCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/sign-in";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
