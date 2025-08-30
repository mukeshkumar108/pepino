"use client";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await supabaseClient.auth.signOut();
        await fetch("/auth/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: null, refresh_token: null }),
        });
        router.replace("/login");
      }}
      className="text-sm opacity-70 hover:opacity-100 underline"
    >
      Cerrar sesión
    </button>
  );
}
