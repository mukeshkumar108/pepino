import React from "react";
import { DragHandle } from "@/components/dnd/Sortable";
import { GripVertical, Trash2 } from "lucide-react";
import type { LineItem } from "@/lib/invoiceSchema";

type Props = {
  groupId: string;
  item: LineItem;
  itemIndex: number;
  onUpdate: (itemIdx: number, patch: Partial<LineItem>) => void;
  onRemove: (itemIdx: number) => void;
};

function ItemRowBase({ item, itemIndex, onUpdate, onRemove }: Props) {
  return (
    <div className="grid grid-cols-12 grid-rows-2 md:grid-rows-1 gap-2 items-center">
      {/* drag handle — bigger hit area on mobile */}
      <DragHandle
        className="col-span-2 md:col-span-1 flex items-center justify-center p-3 md:p-2 rounded hover:bg-neutral-100 min-w-[40px] min-h-[40px]"
        title="Arrastrar para reordenar"
      >
        <GripVertical className="w-5 h-5 md:w-4 md:h-4" />
      </DragHandle>

      {/* description — top row on mobile */}
      <input
        aria-label="Descripción"
        className="col-span-10 md:col-span-5 border rounded p-2 h-11"
        value={item.desc}
        onChange={(e) => onUpdate(itemIndex, { desc: e.target.value })}
      />

      {/* qty — second row on mobile */}
      <input
        aria-label="Cantidad"
        className="col-span-3 md:col-span-2 border rounded p-2 text-right h-11 row-start-2 md:row-auto"
        inputMode="numeric"
        pattern="[0-9]*"
        value={item.qty}
        onChange={(e) => onUpdate(itemIndex, { qty: Number(e.target.value || 0) })}
      />

      {/* unit price */}
      <input
        aria-label="Precio unitario"
        className="col-span-4 md:col-span-2 border rounded p-2 text-right h-11 row-start-2 md:row-auto"
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
      <div className="col-span-3 md:col-span-1 row-start-2 md:row-auto text-right tabular-nums whitespace-nowrap">
        {(item.qty * item.unit.amount).toFixed(2)}
      </div>

      {/* remove action — its own slot so it never overlaps */}
      <div className="col-span-2 md:col-span-1 row-start-2 md:row-auto flex justify-end shrink-0">
        <button
          type="button"
          aria-label="Quitar ítem"
          onClick={() => onRemove(itemIndex)}
          className="p-3 md:p-2 rounded hover:bg-rose-50 text-rose-600"
          title="Quitar ítem"
        >
          <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      </div>
    </div>
  );
}

export const ItemRow = React.memo(ItemRowBase);
