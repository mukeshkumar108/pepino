import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { exampleInvoice } from "@/lib/invoiceSchema";
import { DEFAULT_TERMS } from "@/lib/defaults";

export default async function NewInvoicePage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // single source of initial invoice data
  const payload = { ...exampleInvoice, groups: [], terms: DEFAULT_TERMS };

  const { data, error } = await supabase
    .from("invoices")
    .insert({ user_id: user.id, data: payload })
    .select("id")
    .single();

  if (!data || error) throw error ?? new Error("No se pudo crear la factura");
  redirect(`/app/invoices/${data.id}`);
}
