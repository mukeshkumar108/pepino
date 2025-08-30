"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState<"idle"|"pw"|"otp">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading("pw");
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pw });
    if (error) {
      setErr(error.message);
      setLoading("idle");
      return;
    }
    // Persist the session to server cookies
    const session = data.session;
    if (!session) {
      setErr("No session returned.");
      setLoading("idle");
      return;
    }
    const res = await fetch("/auth/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });
    if (!res.ok) {
      setErr("No pude establecer la sesión en el servidor.");
      setLoading("idle");
      return;
    }
    router.replace("/app");
  }

  async function sendMagicLink(e: React.MouseEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading("otp");
    const redirectTo =
      typeof window !== "undefined"
        ? `${location.origin}/auth/callback?next=/app`
        : undefined;
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setErr(error.message);
      setLoading("idle");
      return;
    }
    setMsg("Te envié un enlace mágico. Revisa tu correo ✉️");
    setLoading("idle");
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form
        onSubmit={signInWithPassword}
        className="w-full max-w-md border rounded-xl p-6 space-y-4 bg-[var(--card)]"
      >
        <h1 className="text-xl font-semibold">Entrar</h1>

        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-green-600">{msg}</div>}

        <label className="block text-sm">
          <span className="opacity-70">Email</span>
          <input
            type="email"
            required
            className="mt-1 w-full border rounded p-2 h-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
          />
        </label>

        <label className="block text-sm">
          <span className="opacity-70">Contraseña</span>
          <input
            type="password"
            className="mt-1 w-full border rounded p-2 h-10"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={loading !== "idle"}
          className="w-full border rounded px-3 py-2"
        >
          {loading === "pw" ? "Entrando..." : "Entrar"}
        </button>

        <div className="text-center text-sm opacity-70">— o —</div>

        <button
          type="button"
          onClick={sendMagicLink}
          disabled={loading !== "idle" || !email}
          className="w-full border rounded px-3 py-2"
          title="Te enviaremos un enlace al correo"
        >
          {loading === "otp" ? "Enviando..." : "Enviar enlace mágico"}
        </button>
      </form>
    </div>
  );
}
