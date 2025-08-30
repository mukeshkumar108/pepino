"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

// Avoid static prerendering for this route
export const dynamic = "force-dynamic";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        const next = params.get("next") || "/app";

        // Read tokens from URL hash: /auth/callback#access_token=...&refresh_token=...
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        if (access_token && refresh_token) {
          // 1) Set session in supabase-js (client)
          await supabaseClient.auth.setSession({
            access_token: access_token as string,
            refresh_token: refresh_token as string,
          });

          // 2) Persist session cookies on the server (so SSR sees the user)
          await fetch("/auth/set", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token, refresh_token }),
          });

          // 3) Go to the app
          router.replace(next);
          return;
        }
      } catch (err) {
        console.error("Auth callback error:", err);
      }

      // Fallback if no tokens in hash
      router.replace("/login");
    })();
  }, [router, params]);

  return (
    <div className="min-h-screen grid place-items-center p-8">
      Procesando inicio de sesión…
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center p-8">
          Procesando inicio de sesión…
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
