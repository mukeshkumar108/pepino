import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: original, error: selErr } = await supabase
    .from("invoices").select("*").eq("id", id).eq("user_id", user.id).single();
  if (selErr || !original) return NextResponse.json({ error: selErr?.message || "not found" }, { status: 404 });

  const copy = { ...original, id: undefined, status: "draft", created_at: undefined, updated_at: undefined };
  const { data: inserted, error: insErr } = await supabase
    .from("invoices").insert({ user_id: user.id, data: copy.data, status: "draft" }).select("id").single();
  if (insErr || !inserted) return NextResponse.json({ error: insErr?.message || "failed" }, { status: 400 });

  return NextResponse.json({ id: inserted.id });
}
