"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { 
  DndContext, 
  DragEndEvent,
  DragStartEvent,
  DragOverlay, 
  closestCenter,
  MeasuringStrategy
 } from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { SortableList, SortableItem, useDndSensors } from "@/components/dnd/Sortable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";
import { Field } from "@/components/ui/Field";

import { Invoice, exampleInvoice, LineItem, Group } from "@/lib/invoiceSchema";
import { GroupCard } from "@/components/invoice/GroupCard";

import { invoiceTotalsQ } from "@/lib/totals";
import { parseFreeText } from "@/lib/parse";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Status = "draft" | "quote" | "invoice" | "paid";

const STATUS_LABEL: Record<Status, string> = {
  draft: "Borrador",
  quote: "Propuesta",
  invoice: "Factura",
  paid: "Pagada",
};

const STATUS_CHIP: Record<Status, string> = {
  draft:   "bg-neutral-100 text-neutral-800 border border-neutral-200",
  quote:   "bg-blue-50 text-blue-700 border border-blue-200",
  invoice: "bg-amber-50 text-amber-800 border border-amber-200",
  paid:    "bg-green-50 text-green-700 border border-green-200",
};

function StatusChip({ s }: { s: Status }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${STATUS_CHIP[s]}`}>
      {s === "paid" ? "✅ " : null}
      {s === "quote" ? "Propuesta" : s === "invoice" ? "Factura" : s === "draft" ? "Borrador" : "Pagada"}
    </span>
  );
}

function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function useDebounce<T extends unknown[]>(fn: (...args: T) => void, ms = 600) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: T) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), ms);
  }, [fn, ms]);
}

export default function CreateInvoicePage({
  initial,
  invoiceId,
  initialStatus,
}: {
  initial?: Invoice;
  invoiceId?: string;
  initialStatus?: Status;
}) {
  const [inv, setInv] = useState<Invoice>(initial ?? { ...exampleInvoice, groups: [] });
  const { subtotal, tax, total } = useMemo(() => invoiceTotalsQ(inv), [inv]);
  const [quickText, setQuickText] = useState("");
  const [autofocusItemId, setAutofocusItemId] = useState<string | undefined>(undefined);
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus ?? "draft");

    // autosave indicator + debounced save
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const recentlySaved = !!savedAt && Date.now() - savedAt < 1500;

  const saveDebounced = useDebounce(async (next: Invoice) => {
    if (!invoiceId) return;
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: next, status }), // 👈 include status
    });
    setSavedAt(Date.now());
  }, 700);

  useEffect(() => {
    saveDebounced(inv);
  }, [inv, saveDebounced]);
  
  async function saveNow() {
    if (!invoiceId) return;
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: inv, status }),
    });
    setSavedAt(Date.now());
  }

  async function handleDelete() {
    if (!invoiceId) return;
    const ok = confirm("¿Eliminar esta factura? Esta acción no se puede deshacer.");
    if (!ok) return;
    const res = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
    if (res.ok) router.replace("/app");
    else alert("No se pudo eliminar.");
  }

  async function handleDuplicate() {
    if (!invoiceId) return;
    const res = await fetch(`/api/invoices/${invoiceId}/duplicate`, { method: "POST" });
    if (!res.ok) return alert("No se pudo duplicar.");
    const { id } = await res.json();
    router.replace(`/app/invoices/${id}`);
  }

  function onChangeStatus(next: Status) {
    setStatus(next);
    if (!invoiceId) return;
    fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: inv, status: next }), // pass the NEW status explicitly
    })
      .then(() => setSavedAt(Date.now()))
      .catch(() => {/* no-op */});
  }


  // ---- PDF handlers (dynamic import keeps Vercel happy) ----
  async function handleDownload() {
    const { downloadInvoicePdf } = await import("@/lib/pdf");
    await downloadInvoicePdf(inv, {
      title: STATUS_LABEL[status],
      logoUrl: "/rosegold_logo-big--white.png",                // put a file in /public/logo.png
      footerNote: inv.client.name ? `Cliente: ${inv.client.name}` : "",
    });
  }
  async function handlePreview() {
    const { openInvoicePdf } = await import("@/lib/pdf");
    await openInvoicePdf(inv, {
      title: STATUS_LABEL[status],
      logoUrl: "/rosegold_logo-big--white.png",
      footerNote: inv.client.name ? `Cliente: ${inv.client.name}` : "",
    });
  }

  // ---- client/meta helpers ----
  function setClientName(name: string) {
    setInv((v) => ({ ...v, client: { ...v.client, name } }));
  }

  // ---- groups CRUD ----
  function addGroup() {
    const newGroup: Group = { id: uid("grp"), title: "Nuevo grupo", items: [] };
    setInv((v) => ({ ...v, groups: [...v.groups, newGroup] }));
  }
  function renameGroup(groupIdx: number, title: string) {
    setInv((v) => {
      const groups = v.groups.map((g, gi) => (gi === groupIdx ? { ...g, title } : g));
      return { ...v, groups };
    });
  }
  function removeGroup(groupIdx: number) {
    setInv((v) => {
      const groups = v.groups.filter((_, gi) => gi !== groupIdx);
      return { ...v, groups };
    });
  }

  // ---- items CRUD ----
  function addItem(groupIdx: number) {
    const id = uid("it");
    const newItem: LineItem = {
      id,
      qty: 1,
      desc: "Nuevo ítem",
      unit: { amount: 0, currency: "GTQ" },
    };
    setInv((v) => {
      const groups = v.groups.map((g, gi) =>
        gi === groupIdx ? { ...g, items: [...g.items, newItem] } : g
      );
      return { ...v, groups };
    });
    setAutofocusItemId(id); // NEW
  }
  function updateItem(groupIdx: number, itemIdx: number, patch: Partial<LineItem>) {
    setInv((v) => {
      const groups = v.groups.map((g, gi) =>
        gi !== groupIdx
          ? g
          : {
              ...g,
              items: g.items.map((it, ii) => (ii !== itemIdx ? it : { ...it, ...patch })),
            }
      );
      return { ...v, groups };
    });
  }
  function removeItem(groupIdx: number, itemIdx: number) {
    setInv((v) => {
      const groups = v.groups.map((g, gi) =>
        gi !== groupIdx ? g : { ...g, items: g.items.filter((_, ii) => ii !== itemIdx) }
      );
      return { ...v, groups };
    });
  }

  // ---- Magic Input Box → merge parsed groups/items ----
  function applyParsedText() {
    const groups = parseFreeText(quickText);
    if (!groups.length) return;
    setInv((v) => {
      const next = structuredClone(v);
      for (const g of groups) {
        let gi = next.groups.findIndex(
          (x) => x.title.trim().toLowerCase() === g.title.trim().toLowerCase()
        );
        if (gi < 0) {
          next.groups.push({ id: uid("grp"), title: g.title, items: [] });
          gi = next.groups.length - 1;
        }
        for (const it of g.items) {
          next.groups[gi].items.push({
            id: uid("it"),
            desc: it.desc,
            qty: it.qty ?? 1,
            unit: { amount: it.price ?? 0, currency: it.currency ?? "GTQ" },
          });
        }
      }
      return next;
    });
    setQuickText("");
  }

  // ---- Drag & Drop wiring (fast groups on mobile) ----
  // Use a small movement distance to start drag (no long-press).
  const sensors = useDndSensors({ pointer: { distance: 4 } });

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  function onDragStart(e: DragStartEvent) {
    const a = String(e.active.id);
    if (inv.groups.some((g) => g.id === a)) {
      setActiveGroupId(a);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveGroupId(null);
    if (!over || active.id === over.id) return;

    // 1) group ↔ group
    const groupIds = inv.groups.map((g) => g.id);
    const a = String(active.id);
    const b = String(over.id);
    if (groupIds.includes(a) && groupIds.includes(b)) {
      const from = groupIds.indexOf(a);
      const to = groupIds.indexOf(b);
      if (from === to) return;
      setInv((v) => {
        const next = structuredClone(v);
        const [moved] = next.groups.splice(from, 1);
        next.groups.splice(to, 0, moved);
        return next;
      });
      return;
    }

    // 2) item ↔ item (within same group) — ids encoded as `${groupId}::${itemId}`
    const decode = (id: string) => id.split("::");
    const aId = String(active.id);
    const bId = String(over.id);
    if (aId.includes("::") && bId.includes("::")) {
      const [gA, iA] = decode(aId);
      const [gB, iB] = decode(bId);
      if (gA === gB) {
        setInv((v) => {
          const next = structuredClone(v);
          const gi = next.groups.findIndex((g) => g.id === gA);
          const ids = next.groups[gi].items.map((it) => it.id);
          const from = ids.indexOf(iA);
          const to = ids.indexOf(iB);
          if (from < 0 || to < 0 || from === to) return v;
          const [moved] = next.groups[gi].items.splice(from, 1);
          next.groups[gi].items.splice(to, 0, moved);
          return next;
        });
      }
    }
  }

  const hasItems = useMemo(
    () => inv.groups.some((g) => g.items.length > 0),
    [inv.groups]
  );


  return (
    <>
      <div className="mx-auto max-w-3xl p-4 pb-28 space-y-6">
        <h1 className="text-2xl font-semibold">Crear factura / propuesta</h1>
        {/* Editor toolbar */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/app" className="text-sm underline">← Volver</Link>
            <StatusChip s={status} />   {/* add this */}
            <div className="text-xs opacity-70">
              {invoiceId ? (recentlySaved ? "Guardado ✓" : "Guardando…") : "Borrador local"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-2 py-1 text-sm"
              value={status}
              onChange={(e) => onChangeStatus(e.target.value as Status)}
            >
              <option value="draft">Borrador</option>
              <option value="quote">Propuesta</option>
              <option value="invoice">Factura</option>
              <option value="paid">Pagada</option>
            </select>
            <button onClick={handleDuplicate} className="text-sm underline">Duplicar</button>
            {status !== "paid" && (
              <button onClick={handleDelete} className="text-sm underline text-red-600">Eliminar</button>
            )}
          </div>
        </div>

        {/* Client + Event */}
        <Card className="p-3 space-y-3">
          <Field label="Cliente">
            <input
              className="w-full border rounded p-3 h-11"
              value={inv.client.name}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </Field>
          <Field label="Dirección del cliente (opcional)">
            <textarea
              className="w-full border rounded p-3 min-h-[72px]"
              value={inv.client.address ?? ""}
              onChange={(e) =>
                setInv((v) => ({ ...v, client: { ...v.client, address: e.target.value } }))
              }
              placeholder={`Calle 123
          Colonia Centro
          Ciudad, País`}
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Evento / Título">
              <input
                className="w-full border rounded p-3 h-11"
                value={inv.event?.name || ""}
                onChange={(e) =>
                  setInv((v) => ({ ...v, event: { ...v.event, name: e.target.value } }))
                }
                placeholder="p.ej. Boda García — catering"
              />
            </Field>
            <Field label="Fecha">
              <input
                type="date"
                className="w-full border rounded p-3 h-11"
                value={inv.event?.date || ""}
                onChange={(e) =>
                  setInv((v) => ({ ...v, event: { ...v.event, date: e.target.value } }))
                }
              />
            </Field>
            <Field label="Dirección / Lugar">
              <textarea
                className="w-full border rounded p-3 min-h-[72px]"
                value={inv.event?.location || ""}
                onChange={(e) =>
                  setInv((v) => ({ ...v, event: { ...v.event, location: e.target.value } }))
                }
                placeholder={`Calle 123
                Colonia Centro
                Ciudad, País`}
              />
            </Field>
          </div>
        </Card>

        {/* MAGIC INPUT */}
        <Card className="p-3 space-y-3">
          <Field label="Texto libre (opcional)">
            <textarea
              id="magic-input" 
              className="w-full border rounded p-3 min-h-[120px]"
              placeholder={`Ejemplos:
Mobiliario:
Sillas 100 x 15
Mesas 10 @ 50

Logística:
Transporte Q2000
Luces 1 x 500`}
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
            />
          </Field>
          <div className="flex justify-end">
            <Button onClick={applyParsedText}>Convertir a ítems</Button>
          </div>
        </Card>

        {/* Groups + Items with DnD */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">Secciones / Grupos</h2>
          <Button variant="primary" onClick={addGroup}>+ Añadir grupo</Button>
        </div>

        {inv.groups.length === 0 ? (
          <Card className="p-6 text-center space-y-3 bg-[var(--card)] text-[var(--text)]">
            <h3 className="text-base font-semibold">Sin grupos aún</h3>
            <p className="text-sm text-[var(--muted)]">
              Añade tu primer grupo o pega texto en “Texto libre” y conviértelo en ítems.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={addGroup}>Añadir grupo</Button>
              <Button
                variant="secondary"
                onClick={() => document.getElementById("magic-input")?.scrollIntoView({ behavior: "smooth" })}
              >
                Usar texto libre
              </Button>
            </div>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          >
            <SortableList ids={inv.groups.map((g) => g.id)}>
              {inv.groups.map((g, gi) => (
                <SortableItem key={g.id} id={g.id}>
                  <GroupCard
                    group={g}
                    groupIndex={gi}
                    onRename={renameGroup}
                    onRemoveGroup={removeGroup}
                    onAddItem={addItem}
                    onUpdateItem={updateItem}
                    onRemoveItem={removeItem}
                    autofocusId={autofocusItemId}
                  />
                </SortableItem>
              ))}
            </SortableList>

            {/* 👇 DragOverlay must be inside DndContext */}
            <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }}>
              {activeGroupId ? (
                <Card className="p-3 pointer-events-none shadow-lg border border-[var(--chip-ring)] bg-[var(--card)]">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded bg-[var(--chip-ring)]/60" />
                    <div className="font-medium">
                      {inv.groups.find((x) => x.id === activeGroupId)?.title ?? "Grupo"}
                    </div>
                    <div className="ml-auto text-sm text-[var(--muted)]">
                      {(inv.groups.find((x) => x.id === activeGroupId)?.items.length ?? 0)} ítems
                    </div>
                  </div>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}    



        {/* Totals + quick tax */}
        {hasItems && (
          <Card className="p-3 space-y-2">
            <div className="text-right">
              SUBTOTAL: <strong>Q {subtotal.toFixed(2)}</strong>
            </div>
            <div className="text-right">
              IMPUESTOS ({(inv.tax.rate * 100).toFixed(0)}%): <strong>Q {tax.toFixed(2)}</strong>
            </div>
            <div className="text-right text-lg">
              TOTAL: <strong>Q {total.toFixed(2)}</strong>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setInv((v) => ({ ...v, tax: { rate: 0 } }))}>
                IVA 0%
              </Button>
              <Button
                variant="secondary"
                onClick={() => setInv((v) => ({ ...v, tax: { rate: 0.12 } }))}
              >
                IVA 12%
              </Button>
            </div>
          </Card>
        )}
        {/* Details / Terms / Bank */}
        <Collapsible title="Más detalles" defaultOpen={false}>
          <Card className="p-3 space-y-4">
            {/* Terms */}
            <Field label="Condiciones del servicio">
              <textarea
                className="w-full border rounded p-3 min-h-[140px]"
                placeholder="Puedes escribir párrafos o bullets (líneas que empiecen con - o •)."
                value={inv.terms ?? ""}
                onChange={(e) => setInv((v) => ({ ...v, terms: e.target.value }))}
              />
            </Field>

            {/* Notes */}
            <Field label="Notas adicionales">
              <textarea
                className="w-full border rounded p-3 min-h-[100px]"
                placeholder="Notas libres para esta factura..."
                value={inv.notes ?? ""}
                onChange={(e) => setInv((v) => ({ ...v, notes: e.target.value }))}
              />
            </Field>

            {/* Bank details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="font-medium">Cuenta en Quetzales (Q)</div>
                <input
                  className="w-full border rounded p-3 h-11"
                  placeholder="Banco"
                  value={inv.bank?.gtq?.bank ?? ""}
                  onChange={(e) =>
                    setInv((v) => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        gtq: {
                          ...(v.bank?.gtq ?? { bank: "", type: "", account: "", name: "" }),
                          bank: e.target.value,
                        },
                      },
                    }))
                  }
                />
                <input
                  className="w-full border rounded p-3 h-11"
                  placeholder="Tipo de cuenta (p.ej. MONETARIA)"
                  value={inv.bank?.gtq?.type ?? ""}
                  onChange={(e) =>
                    setInv((v) => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        gtq: {
                          ...(v.bank?.gtq ?? { bank: "", type: "", account: "", name: "" }),
                          type: e.target.value,
                        },
                      },
                    }))
                  }
                />
                <input
                  className="w-full border rounded p-3 h-11"
                  placeholder="Número de cuenta"
                  value={inv.bank?.gtq?.account ?? ""}
                  onChange={(e) =>
                    setInv((v) => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        gtq: {
                          ...(v.bank?.gtq ?? { bank: "", type: "", account: "", name: "" }),
                          account: e.target.value,
                        },
                      },
                    }))
                  }
                />
                <input
                  className="w-full border rounded p-3 h-11"
                  placeholder="Nombre del titular"
                  value={inv.bank?.gtq?.name ?? ""}
                  onChange={(e) =>
                    setInv((v) => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        gtq: {
                          ...(v.bank?.gtq ?? { bank: "", type: "", account: "", name: "" }),
                          name: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="font-medium">Cuenta en USD (opcional)</div>
                <input
                  className="w-full border rounded p-3 h-11"
                  placeholder="Banco"
                  value={inv.bank?.usd?.bank ?? ""}
                  onChange={(e) =>
                    setInv((v) => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        usd: {
                          ...(v.bank?.usd ?? { bank: "", type: "", account: "", name: "" }),
                          bank: e.target.value,
                        },
                      },
                    }))
                  }
                />
                <input
                  className="w-full border rounded p-3 h-11"
                  placeholder="Tipo de cuenta"
                  value={inv.bank?.usd?.type ?? ""}
                  onChange={(e) =>
                    setInv((v) => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        usd: {
                          ...(v.bank?.usd ?? { bank: "", type: "", account: "", name: "" }),
                          type: e.target.value,
                        },
                      },
                    }))
                  }
                />
                <input
                  className="w-full border rounded p-3 h-11"
                  placeholder="Número de cuenta"
                  value={inv.bank?.usd?.account ?? ""}
                  onChange={(e) =>
                    setInv((v) => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        usd: {
                          ...(v.bank?.usd ?? { bank: "", type: "", account: "", name: "" }),
                          account: e.target.value,
                        },
                      },
                    }))
                  }
                />
                <input
                  className="w-full border rounded p-3 h-11"
                  placeholder="Nombre del titular"
                  value={inv.bank?.usd?.name ?? ""}
                  onChange={(e) =>
                    setInv((v) => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        usd: {
                          ...(v.bank?.usd ?? { bank: "", type: "", account: "", name: "" }),
                          name: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </div>
            </div>
          </Card>
        </Collapsible>

      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-white border-t border-neutral-200">
        <div className="mx-auto max-w-3xl px-3 py-2 flex items-center gap-2">
          <Link href="/app" className="border rounded px-3 py-2">Listo</Link>
          {invoiceId && (
            <button onClick={saveNow} className="text-xs underline opacity-80 hover:opacity-100">
              Guardar ahora
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={handlePreview}>Vista previa</Button>
            <Button onClick={handleDownload}>Descargar</Button>
          </div>
        </div>
      </div>
    </>
  );
}
