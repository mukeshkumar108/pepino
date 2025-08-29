"use client";

import { useMemo, useState } from "react";
import { Invoice, exampleInvoice, LineItem, Group } from "@/lib/invoiceSchema";
import { invoiceTotalsQ } from "@/lib/totals";

function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CreateInvoicePage() {
  const [inv, setInv] = useState<Invoice>(exampleInvoice);
  const { subtotal, tax, total } = useMemo(() => invoiceTotalsQ(inv), [inv]);

  // ---- meta + client ----
  function setClientName(name: string) {
    setInv((v) => ({ ...v, client: { ...v.client, name } }));
  }

  // ---- groups ----
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

  // ---- items ----
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

  async function handleDownload() {
    const { downloadInvoicePdf } = await import("@/lib/pdf");
    await downloadInvoicePdf(inv);
  }
  async function handlePreview() {
    const { openInvoicePdf } = await import("@/lib/pdf");
    await openInvoicePdf(inv);
  }
  // local UI state for expanding details
  const [showDetails, setShowDetails] = useState(true);

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Crear factura / propuesta</h1>

      {/* Client + event */}
      <section className="space-y-2">
        <label className="block text-sm font-medium">Cliente</label>
        <input
          className="w-full border rounded p-2"
          value={inv.client.name}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Nombre del cliente"
        />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium">Evento</label>
          <input
            className="w-full border rounded p-2"
            value={inv.event?.name || ""}
            onChange={(e) =>
              setInv((v) => ({ ...v, event: { ...v.event, name: e.target.value } }))
            }
            placeholder="Nombre del evento"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Fecha</label>
          <input
            type="date"
            className="w-full border rounded p-2"
            value={inv.event?.date || ""}
            onChange={(e) =>
              setInv((v) => ({ ...v, event: { ...v.event, date: e.target.value } }))
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Lugar</label>
          <input
            className="w-full border rounded p-2"
            value={inv.event?.location || ""}
            onChange={(e) =>
              setInv((v) => ({ ...v, event: { ...v.event, location: e.target.value } }))
            }
            placeholder="Ciudad / Dirección"
          />
        </div>
      </section>

      {/* Groups + Items */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Secciones / Grupos</h2>
        <button
          onClick={addGroup}
          className="px-3 py-1.5 rounded bg-black text-white text-sm"
        >
          + Añadir grupo
        </button>
      </div>

      {inv.groups.map((g, gi) => (
        <div key={g.id} className="border rounded p-3 space-y-3">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 border rounded p-2 font-medium"
              value={g.title}
              onChange={(e) => renameGroup(gi, e.target.value)}
            />
            <button
              onClick={() => removeGroup(gi)}
              className="px-2 py-1 rounded border text-sm"
              title="Eliminar grupo"
            >
              Eliminar
            </button>
          </div>

          <div className="grid grid-cols-12 gap-2 text-sm font-semibold">
            <div className="col-span-2">Cant</div>
            <div className="col-span-6">Descripción</div>
            <div className="col-span-2 text-right">Precio U. (Q)</div>
            <div className="col-span-2 text-right">Total (Q)</div>
          </div>

          {g.items.map((it, ii) => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
              <input
                className="col-span-2 border rounded p-1"
                type="number"
                min={0}
                value={it.qty}
                onChange={(e) => updateItem(gi, ii, { qty: Number(e.target.value) })}
              />
              <input
                className="col-span-6 border rounded p-1"
                value={it.desc}
                onChange={(e) => updateItem(gi, ii, { desc: e.target.value })}
              />
              <input
                className="col-span-2 border rounded p-1 text-right"
                type="number"
                min={0}
                value={it.unit.amount}
                onChange={(e) =>
                  updateItem(gi, ii, { unit: { ...it.unit, amount: Number(e.target.value) } })
                }
              />
              <div className="col-span-2 text-right">
                {(it.qty * it.unit.amount).toFixed(2)}
              </div>
              <div className="col-span-12 flex justify-end">
                <button
                  onClick={() => removeItem(gi, ii)}
                  className="px-2 py-1 rounded border text-xs"
                >
                  Quitar ítem
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => addItem(gi)}
            className="px-3 py-1.5 rounded bg-black text-white text-sm"
          >
            + Añadir ítem
          </button>
        </div>
      ))}

      {/* Totals */}
      <section className="space-y-1 text-right">
        <div>
          SUBTOTAL: <strong>Q {subtotal.toFixed(2)}</strong>
        </div>
        <div>
          IMPUESTOS ({(inv.tax.rate * 100).toFixed(0)}%):{" "}
          <strong>Q {tax.toFixed(2)}</strong>
        </div>
        <div className="text-lg">
          TOTAL: <strong>Q {total.toFixed(2)}</strong>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setInv((v) => ({ ...v, tax: { rate: 0 } }))}
            className="px-2 py-1 rounded border text-xs"
          >
            IVA 0%
          </button>
          <button
            onClick={() => setInv((v) => ({ ...v, tax: { rate: 0.12 } }))}
            className="px-2 py-1 rounded border text-xs"
          >
            IVA 12%
          </button>
        </div>
      </section>

      {/* Details / Terms / Bank */}
      <div className="border rounded">
        <button
          type="button"
          className="w-full flex items-center justify-between p-3"
          onClick={() => setShowDetails(v => !v)}
        >
          <span className="font-medium">Más detalles</span>
          <span className="text-sm">{showDetails ? "Ocultar" : "Mostrar"}</span>
        </button>

        {showDetails && (
          <div className="p-3 space-y-4">
            {/* Terms textarea */}
            <div>
              <label className="block text-sm font-medium mb-1">Condiciones del servicio</label>
              <textarea
                className="w-full border rounded p-2 min-h-[140px]"
                placeholder="Puedes escribir párrafos o bullets (líneas que empiecen con - o •). Deja una línea en blanco para separar párrafos."
                value={inv.terms ?? ""}
                onChange={(e) =>
                  setInv(v => ({ ...v, terms: e.target.value }))
                }
              />
              <div className="text-xs text-gray-500 mt-1">
                {((inv.terms ?? "").split(/\r?\n/).length)} líneas
              </div>
            </div>
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notas adicionales</label>
              <textarea
                className="w-full border rounded p-2 min-h-[100px]"
                placeholder="Escribe notas libres para esta factura..."
                value={inv.notes ?? ""}
                onChange={(e) =>
                  setInv((v) => ({ ...v, notes: e.target.value }))
                }
              />
            </div>


            {/* Bank details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="font-medium">Cuenta en Quetzales (Q)</div>
                <input
                  className="w-full border rounded p-2"
                  placeholder="Banco"
                  value={inv.bank?.gtq?.bank ?? ""}
                  onChange={(e) =>
                    setInv(v => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        gtq: { ...(v.bank?.gtq ?? { bank: "", type: "", account: "", name: "" }),
                          bank: e.target.value },
                      },
                    }))
                  }
                />
                <input
                  className="w-full border rounded p-2"
                  placeholder="Tipo de cuenta (p.ej. MONETARIA)"
                  value={inv.bank?.gtq?.type ?? ""}
                  onChange={(e) =>
                    setInv(v => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        gtq: { ...(v.bank?.gtq ?? { bank: "", type: "", account: "", name: "" }),
                          type: e.target.value },
                      },
                    }))
                  }
                />
                <input
                  className="w-full border rounded p-2"
                  placeholder="Número de cuenta"
                  value={inv.bank?.gtq?.account ?? ""}
                  onChange={(e) =>
                    setInv(v => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        gtq: { ...(v.bank?.gtq ?? { bank: "", type: "", account: "", name: "" }),
                          account: e.target.value },
                      },
                    }))
                  }
                />
                <input
                  className="w-full border rounded p-2"
                  placeholder="Nombre del titular"
                  value={inv.bank?.gtq?.name ?? ""}
                  onChange={(e) =>
                    setInv(v => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        gtq: { ...(v.bank?.gtq ?? { bank: "", type: "", account: "", name: "" }),
                          name: e.target.value },
                      },
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="font-medium">Cuenta en USD (opcional)</div>
                <input
                  className="w-full border rounded p-2"
                  placeholder="Banco"
                  value={inv.bank?.usd?.bank ?? ""}
                  onChange={(e) =>
                    setInv(v => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        usd: { ...(v.bank?.usd ?? { bank: "", type: "", account: "", name: "" }),
                          bank: e.target.value },
                      },
                    }))
                  }
                />
                <input
                  className="w-full border rounded p-2"
                  placeholder="Tipo de cuenta"
                  value={inv.bank?.usd?.type ?? ""}
                  onChange={(e) =>
                    setInv(v => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        usd: { ...(v.bank?.usd ?? { bank: "", type: "", account: "", name: "" }),
                          type: e.target.value },
                      },
                    }))
                  }
                />
                <input
                  className="w-full border rounded p-2"
                  placeholder="Número de cuenta"
                  value={inv.bank?.usd?.account ?? ""}
                  onChange={(e) =>
                    setInv(v => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        usd: { ...(v.bank?.usd ?? { bank: "", type: "", account: "", name: "" }),
                          account: e.target.value },
                      },
                    }))
                  }
                />
                <input
                  className="w-full border rounded p-2"
                  placeholder="Nombre del titular"
                  value={inv.bank?.usd?.name ?? ""}
                  onChange={(e) =>
                    setInv(v => ({
                      ...v,
                      bank: {
                        ...v.bank,
                        usd: { ...(v.bank?.usd ?? { bank: "", type: "", account: "", name: "" }),
                          name: e.target.value },
                      },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PDF */}
      <div className="flex gap-3">
        <button onClick={handleDownload} className="px-4 py-2 rounded bg-black text-white">
            Descargar PDF
          </button>
          <button onClick={handlePreview} className="px-4 py-2 rounded border">
            Vista previa
          </button>
        </div>
    </div>
  );
}
