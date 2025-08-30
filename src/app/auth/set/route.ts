// src/app/auth/set/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type SetBody = {
  access_token?: string;
  refresh_token?: string;
};

export async function POST(req: Request) {
  // Parse body without `any`
  let body: SetBody = {};
  try {
    body = (await req.json()) as SetBody;
  } catch {
    body = {};
  }

  // In route handlers you can await cookies() and write safely
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // Type the setter using the cookieStore.set signature
        setAll: (
          cookiesToSet: {
            name: string;
            value: string;
            options: Parameters<typeof cookieStore.set>[2];
          }[]
        ) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  if (body.access_token && body.refresh_token) {
    await supabase.auth.setSession({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    });
  } else {
    await supabase.auth.signOut();
  }

  return NextResponse.json({ ok: true });
}
