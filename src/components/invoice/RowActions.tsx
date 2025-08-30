"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Trash2, Pencil } from "lucide-react";

type Status = "draft" | "quote" | "invoice" | "paid";

export function RowActions({ id, status }: { id: string; status: Status }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDuplicate() {
    try {
      setBusy(true);
      const res = await fetch(`/api/invoices/${id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("dup failed");
      const { id: newId } = (await res.json()) as { id: string };
      router.push(`/app/invoices/${newId}`);
    } catch {
      alert("No se pudo duplicar.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (status === "paid") return;
    if (!confirm("¿Eliminar esta factura? Esta acción no se puede deshacer.")) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      router.refresh(); // re-fetch list
    } catch {
      alert("No se pudo eliminar.");
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "p-1.5 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/app/invoices/${id}`}
        className={btn}
        title="Abrir"
        aria-label="Abrir"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        onClick={onDuplicate}
        className={btn}
        title="Duplicar"
        aria-label="Duplicar"
        disabled={busy}
      >
        <Copy className="h-4 w-4" />
      </button>
      {status !== "paid" && (
        <button
          onClick={onDelete}
          className={btn + " text-red-600 dark:text-red-400"}
          title="Eliminar"
          aria-label="Eliminar"
          disabled={busy}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
