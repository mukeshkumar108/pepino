import React, { useEffect, useRef } from "react";
import { DragHandle } from "@/components/dnd/Sortable";
import { GripVertical, Trash2 } from "lucide-react";
import type { LineItem } from "@/lib/invoiceSchema";

type Props = {
  groupId: string;
  item: LineItem;
  itemIndex: number;
  onUpdate: (itemIdx: number, patch: Partial<LineItem>) => void;
  onRemove: (itemIdx: number) => void;
  autoFocus?: boolean; // NEW
};

function ItemRowBase({ item, itemIndex, onUpdate, onRemove, autoFocus }: Props) {
  const descRef = useRef<HTMLInputElement | null>(null);
  const didFocus = useRef(false);

  // Autofocus newly added row description (once)
  useEffect(() => {
    if (autoFocus && !didFocus.current) {
      didFocus.current = true;
      // slight delay so the element is fully laid out before scrolling/focusing
      const t = setTimeout(() => {
        descRef.current?.focus();
        descRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 20);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  return (
    // Mobile chip look, desktop flat
    <div className="md:bg-transparent bg-[var(--chip-bg)] rounded-xl md:rounded-none ring-1 ring-transparent md:ring-0 hover:ring-[var(--chip-ring)]/80 transition">
      <div className="grid grid-cols-12 grid-rows-2 md:grid-rows-1 gap-2 items-center p-2 md:p-0">
        {/* drag handle */}
        <DragHandle
          className="col-span-2 md:col-span-1 flex items-center justify-center p-3 md:p-2 rounded hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          title="Arrastrar para reordenar"
        >
          <GripVertical className="w-5 h-5 md:w-4 md:h-4" />
        </DragHandle>

        {/* descripción */}
        <input
          ref={descRef}
          aria-label="Descripción"
          className="col-span-10 md:col-span-5 border rounded md:rounded p-2 h-11 placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          value={item.desc}
          onChange={(e) => onUpdate(itemIndex, { desc: e.target.value })}
        />

        {/* cantidad */}
        <input
          aria-label="Cantidad"
          className="col-span-3 md:col-span-2 border rounded p-2 text-right h-11 row-start-2 md:row-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          inputMode="numeric"
          pattern="[0-9]*"
          value={item.qty}
          onChange={(e) => onUpdate(itemIndex, { qty: Number(e.target.value || 0) })}
        />

        {/* precio unitario */}
        <input
          aria-label="Precio unitario"
          className="col-span-4 md:col-span-2 border rounded p-2 text-right h-11 row-start-2 md:row-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          inputMode="decimal"
          value={item.unit.amount}
          onChange={(e) =>
            onUpdate(itemIndex, {
              unit: {
                ...item.unit,
                amount: Number((e.target.value || "0").replace(",", ".")),
              },
            })
          }
        />

        {/* total */}
        <div className="col-span-3 md:col-span-1 row-start-2 md:row-auto text-right tabular-nums whitespace-nowrap font-medium">
          {(item.qty * item.unit.amount).toFixed(2)}
        </div>

        {/* remove */}
        <div className="col-span-2 md:col-span-1 row-start-2 md:row-auto flex justify-end shrink-0">
          <button
            type="button"
            aria-label="Quitar ítem"
            onClick={() => onRemove(itemIndex)}
            className="p-3 md:p-2 rounded hover:bg-[var(--danger-bg)] text-[var(--danger-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            title="Quitar ítem"
          >
            <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const ItemRow = React.memo(ItemRowBase);
