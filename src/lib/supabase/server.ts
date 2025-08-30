import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/** READ-ONLY client for Server Components (pages/layouts/loaders). */
export async function supabaseServer() {
  const cookieStore = await cookies(); // 👈 await
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {
          /* no writes from Server Components */
        },
      },
    }
  );
}

/** WRITABLE client for Route Handlers / Server Actions only. */
export async function supabaseServerWritable() {
  const cookieStore = await cookies(); // 👈 await
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options); // correct signature
          });
        },
      },
    }
  );
}
