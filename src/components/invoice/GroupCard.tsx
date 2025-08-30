import React from "react";
import { Card } from "@/components/ui/Card";
import { SortableList, SortableItem, DragHandle } from "@/components/dnd/Sortable";
import { GripVertical, Trash2 } from "lucide-react";
import type { Group, LineItem } from "@/lib/invoiceSchema";
import { ItemRow } from "./ItemRow";
import { Button } from "@/components/ui/Button";

type Props = {
  group: Group;
  groupIndex: number;
  onRename: (groupIdx: number, title: string) => void;
  onRemoveGroup: (groupIdx: number) => void;
  onAddItem: (groupIdx: number) => void;
  onUpdateItem: (groupIdx: number, itemIdx: number, patch: Partial<LineItem>) => void;
  onRemoveItem: (groupIdx: number, itemIdx: number) => void;
};

function GroupCardBase({
  group,
  groupIndex,
  onRename,
  onRemoveGroup,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}: Props) {
  return (
    <Card className="p-3 space-y-3">
      {/* header */}
      <div className="flex items-center gap-2">
        <DragHandle className="p-3 md:p-2 rounded hover:bg-neutral-100" title="Arrastrar para reordenar">
          <GripVertical className="w-5 h-5 md:w-4 md:h-4" />
        </DragHandle>

        <input
          className="flex-1 border rounded p-3 h-11 font-medium"
          value={group.title}
          onChange={(e) => onRename(groupIndex, e.target.value)}
        />

        <button
          type="button"
          aria-label="Eliminar grupo"
          onClick={() => onRemoveGroup(groupIndex)}
          className="p-3 md:p-2 rounded hover:bg-rose-50 text-rose-600"
          title="Eliminar grupo"
        >
          <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      </div>

      {/* columns header (desktop only) */}
      <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-semibold text-gray-700">
        <div className="col-span-1" /> {/* handle */}
        <div className="col-span-2">Cant</div>
        <div className="col-span-5">Descripción</div>
        <div className="col-span-2 text-right">Precio U. (Q)</div>
        <div className="col-span-1 text-right">Total (Q)</div>
        <div className="col-span-1" /> {/* actions */}
      </div>

      {/* items */}
      <SortableList ids={group.items.map((it) => `${group.id}::${it.id}`)}>
        {group.items.map((it, ii) => (
          <SortableItem key={it.id} id={`${group.id}::${it.id}`}>
            <ItemRow
              groupId={group.id}
              item={it}
              itemIndex={ii}
              onUpdate={(idx, patch) => onUpdateItem(groupIndex, idx, patch)}
              onRemove={(idx) => onRemoveItem(groupIndex, idx)}
            />
          </SortableItem>
        ))}
      </SortableList>

      <Button onClick={() => onAddItem(groupIndex)}>+ Añadir ítem</Button>
    </Card>
  );
}

export const GroupCard = React.memo(GroupCardBase);
