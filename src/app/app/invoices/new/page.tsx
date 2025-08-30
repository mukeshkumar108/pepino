import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { exampleInvoice } from "@/lib/invoiceSchema";

export default async function NewInvoicePage() {
  const supabase = await supabaseServer(); // 👈
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("invoices")
    .insert({ user_id: user!.id, data: { ...exampleInvoice, groups: [] } })
    .select("id")
    .single();

  if (!data || error) throw error ?? new Error("No se pudo crear la factura");
  redirect(`/app/invoices/${data.id}`);
}
