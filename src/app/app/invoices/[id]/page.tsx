import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import CreateInvoicePage from "@/app/create/page";

export default async function InvoiceEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();
  if (!data || error) notFound();
  return (
    <CreateInvoicePage
      initial={data.data}
      invoiceId={id}
      initialStatus={data.status}
    />
  ); // 👈 pass status
}
