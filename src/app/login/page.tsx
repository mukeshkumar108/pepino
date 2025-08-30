"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

// Set to true to hide the Password tab and go magic-link only (for everyone)
const MAGIC_ONLY = false;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState<"magic" | "password">(MAGIC_ONLY ? "magic" : "magic");
  const [loading, setLoading] = useState<"idle" | "magic" | "pw" | "signup">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function loginMagic(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading("magic");
    const redirectTo = `${window.location.origin}/auth/callback?next=/app`;
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) { setErr(error.message); setLoading("idle"); return; }
    setMsg("Te envié un enlace mágico. Revisa tu correo ✉️");
    setLoading("idle");
  }

  async function loginPassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading("pw");
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pw });
    if (error) { setErr(error.message); setLoading("idle"); return; }
    const s = data.session;
    if (!s) { setErr("No hubo sesión de Supabase."); setLoading("idle"); return; }
    // persist cookies on the server (SSR sees user)
    await fetch("/auth/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token }),
    });
    router.replace("/app");
  }

  async function signUpPassword(e: React.MouseEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading("signup");
    const { data, error } = await supabaseClient.auth.signUp({ email, password: pw });
    if (error) { setErr(error.message); setLoading("idle"); return; }
    if (data.user) {
      // If email confirmations are ON in Supabase, they’ll need to confirm via email.
      setMsg("Cuenta creada. Si tu proyecto requiere confirmación por email, revisa tu correo.");
    } else {
      setMsg("Revisa tu correo para confirmar tu cuenta.");
    }
    setLoading("idle");
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md border rounded-xl p-6 space-y-4 bg-[var(--card)]">
        <h1 className="text-xl font-semibold">Entrar</h1>

        {!MAGIC_ONLY && (
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              className={`px-3 py-1 border rounded ${mode === "magic" ? "bg-neutral-100" : ""}`}
              onClick={() => setMode("magic")}
            >
              Enlace mágico
            </button>
            <button
              type="button"
              className={`px-3 py-1 border rounded ${mode === "password" ? "bg-neutral-100" : ""}`}
              onClick={() => setMode("password")}
            >
              Contraseña
            </button>
          </div>
        )}

        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-green-600">{msg}</div>}

        {/* Magic-link form */}
        {mode === "magic" && (
          <form onSubmit={loginMagic} className="space-y-3">
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
            <button
              type="submit"
              disabled={loading !== "idle"}
              className="w-full border rounded px-3 py-2"
              title="Te enviaremos un enlace al correo"
            >
              {loading === "magic" ? "Enviando..." : "Enviar enlace mágico"}
            </button>
          </form>
        )}

        {/* Password form */}
        {!MAGIC_ONLY && mode === "password" && (
          <form onSubmit={loginPassword} className="space-y-3">
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
                required
                className="mt-1 w-full border rounded p-2 h-10"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading !== "idle"}
                className="flex-1 border rounded px-3 py-2"
              >
                {loading === "pw" ? "Entrando..." : "Entrar"}
              </button>
              <button
                type="button"
                onClick={signUpPassword}
                disabled={loading !== "idle" || !email || !pw}
                className="border rounded px-3 py-2 text-sm"
                title="Crear cuenta por contraseña"
              >
                {loading === "signup" ? "Creando..." : "Crear cuenta"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
