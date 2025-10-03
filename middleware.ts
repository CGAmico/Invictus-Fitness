import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname, search } = req.nextUrl;

  // Proteggi SOLO /app/**
  if (pathname.startsWith('/app')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => req.cookies.get(name)?.value,
          set: (name, value, options) => res.cookies.set({ name, value, ...options }),
          remove: (name, options) => res.cookies.set({ name, value: '', ...options }),
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const url = new URL('/login', req.url);
      url.searchParams.set('redirect', pathname + search);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ['/app/:path*'], // ← niente '/'
};
