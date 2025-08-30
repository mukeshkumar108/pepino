import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { RowActions } from "@/components/invoice/RowActions";

type Status = "draft" | "quote" | "invoice" | "paid";

type RowRaw = {
  id: string;
  status: Status | null;
  created_at: string | null;
  client_name: string | null;
  event_name: string | null;
  number: string | null;
};

type InvoiceRow = {
  id: string;
  status: Status;
  created_at: string | null;
  client_name: string | null;
  event_name: string | null;
  number: string | null;
};

const STATUS_LABEL: Record<Status, string> = {
  draft: "Borrador",
  quote: "Propuesta",
  invoice: "Factura",
  paid: "Pagada",
};

const CHIP: Record<Status, string> = {
  draft: "bg-neutral-100 text-neutral-800 border border-neutral-200",
  quote: "bg-blue-50 text-blue-700 border border-blue-200",
  invoice: "bg-amber-50 text-amber-800 border border-amber-200",
  paid: "bg-green-50 text-green-700 border border-green-200",
};

export default async function AppHome() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      id,
      status,
      created_at,
      client_name:data->client->>name,
      event_name:data->event->>name,
      number:data->meta->>number
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
  }

  const rows = (data ?? []) as RowRaw[];
  const invoices: InvoiceRow[] = rows.map((r) => ({
    id: r.id,
    status: (r.status ?? "draft") as Status,
    created_at: r.created_at,
    client_name: r.client_name,
    event_name: r.event_name,
    number: r.number,
  }));

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tus facturas</h1>
        <Link href="/app/invoices/new" className="border rounded px-3 py-2">
          Nueva factura
        </Link>
      </header>

      {invoices.length === 0 ? (
        <div className="border rounded-xl p-6 text-center bg-[var(--card)]">
          <p className="opacity-70 mb-3">Aún no tienes facturas.</p>
          <Link href="/app/invoices/new" className="inline-block border rounded px-3 py-2">
            Crear la primera
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv) => {
            const title =
              inv.event_name?.trim() ||
              inv.client_name?.trim() ||
              inv.number?.trim() ||
              "Sin título";
            const when = inv.created_at ? new Date(inv.created_at).toLocaleString() : "";

            return (
              <li
                key={inv.id}
                className="border rounded p-3 flex items-center justify-between bg-[var(--card)]"
              >
                <div className="min-w-0 mr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{title}</span> {/* title first */}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${CHIP[inv.status]}`}>
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </div>
                  <div className="text-xs opacity-70">{when}</div>
                </div>

                {/* Actions */}
                <RowActions id={inv.id} status={inv.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
