"use client";

import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableList, SortableItem, useDndSensors, DragHandle } from "@/components/dnd/Sortable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";
import { Field } from "@/components/ui/Field";
import { GripVertical, Trash2 } from "lucide-react";

import { Invoice, exampleInvoice, LineItem, Group } from "@/lib/invoiceSchema";
import { GroupCard } from "@/components/invoice/GroupCard";

import { invoiceTotalsQ } from "@/lib/totals";
import { parseFreeText } from "@/lib/parse";

function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CreateInvoicePage() {
  const [inv, setInv] = useState<Invoice>(exampleInvoice);
  const { subtotal, tax, total } = useMemo(() => invoiceTotalsQ(inv), [inv]);
  const [quickText, setQuickText] = useState("");
  const [showDetails, setShowDetails] = useState(true);

  // ---- PDF handlers (dynamic import keeps Vercel happy) ----
  async function handleDownload() {
    const { downloadInvoicePdf } = await import("@/lib/pdf");
    await downloadInvoicePdf(inv);
  }
  async function handlePreview() {
    const { openInvoicePdf } = await import("@/lib/pdf");
    await openInvoicePdf(inv);
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
    const newItem: LineItem = {
      id: uid("it"),
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

  // ---- Drag & Drop wiring ----
  const sensors = useDndSensors({
    pointer: { delay: 220, tolerance: 8 },
  });

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
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

  return (
    <>
      <div className="mx-auto max-w-3xl p-4 pb-28 space-y-6">
        <h1 className="text-2xl font-semibold">Crear factura / propuesta</h1>

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Evento">
              <input
                className="w-full border rounded p-3 h-11"
                value={inv.event?.name || ""}
                onChange={(e) =>
                  setInv((v) => ({ ...v, event: { ...v.event, name: e.target.value } }))
                }
                placeholder="Nombre del evento"
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
            <Field label="Lugar">
              <input
                className="w-full border rounded p-3 h-11"
                value={inv.event?.location || ""}
                onChange={(e) =>
                  setInv((v) => ({ ...v, event: { ...v.event, location: e.target.value } }))
                }
                placeholder="Ciudad / Dirección"
              />
            </Field>
          </div>
        </Card>

        {/* MAGIC INPUT */}
        <Card className="p-3 space-y-3">
          <Field label="Texto libre (opcional)">
            <textarea
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
          <Button variant="primary" onClick={addGroup}>
            + Añadir grupo
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
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
                />
              </SortableItem>
            ))}
          </SortableList>
        </DndContext>

        {/* Totals + quick tax */}
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

        {/* Details / Terms / Bank */}
        <Collapsible title="Más detalles" defaultOpen>
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
      <div className="fixed inset-x-0 bottom-0 z-20 bg-white/95 dark:bg-neutral-950/80 backdrop-blur border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-3xl px-3 py-2 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={handlePreview}>Vista previa</Button>
          <Button className="flex-1" onClick={handleDownload}>Descargar</Button>
        </div>
      </div>
    </>
  );
}
