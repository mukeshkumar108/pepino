"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DeleteInvoiceButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      onClick={() =>
        start(async () => {
          const ok = confirm("¿Eliminar esta factura? Esta acción no se puede deshacer.");
          if (!ok) return;
          const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
          if (res.ok) router.refresh();
          else alert("No se pudo eliminar.");
        })
      }
      className="text-sm opacity-70 hover:opacity-100 underline disabled:opacity-40"
      disabled={pending}
      title="Eliminar"
    >
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
