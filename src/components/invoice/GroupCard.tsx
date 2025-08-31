import React from "react";
import { Card } from "@/components/ui/Card";
import {
  SortableList,
  SortableItem,
  DragHandle,
} from "@/components/dnd/Sortable";
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
  onUpdateItem: (
    groupIdx: number,
    itemIdx: number,
    patch: Partial<LineItem>,
  ) => void;
  onRemoveItem: (groupIdx: number, itemIdx: number) => void;
  autofocusId?: string; // NEW: the item.id to autofocus
};

function GroupCardBase({
  group,
  groupIndex,
  onRename,
  onRemoveGroup,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  autofocusId,
}: Props) {
  return (
    <Card className="p-3 space-y-3 bg-[var(--card)] text-[var(--text)]">
      {/* Group header — sticky on mobile */}
      <div className="sticky top-2 md:static z-10 flex items-center gap-2 rounded-lg ring-1 ring-[var(--group-ring)] bg-[var(--group-bg)]/95 backdrop-blur-sm px-2 py-2 shadow-sm">
        <DragHandle
          className="p-3 md:p-2 rounded hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          title="Arrastrar para reordenar"
        >
          <GripVertical className="w-5 h-5 md:w-4 md:h-4" />
        </DragHandle>

        <input
          className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-base md:text-lg font-semibold placeholder:text-[var(--muted)]"
          value={group.title}
          onChange={(e) => onRename(groupIndex, e.target.value)}
          placeholder="Título del grupo"
        />

        <span className="hidden sm:inline-block text-xs px-2 py-1 rounded-full bg-[var(--chip-ring)]/50 text-[var(--muted)]">
          {group.items.length} ítem{group.items.length === 1 ? "" : "s"}
        </span>

        <button
          type="button"
          aria-label="Eliminar grupo"
          onClick={() => onRemoveGroup(groupIndex)}
          className="p-3 md:p-2 rounded hover:bg-[var(--danger-bg)] text-[var(--danger-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          title="Eliminar grupo"
        >
          <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      </div>

      {/* columns header (desktop only) */}
      <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-semibold text-[var(--muted)]">
        <div className="col-span-1" />
        <div className="col-span-2">Cant</div>
        <div className="col-span-5">Descripción</div>
        <div className="col-span-2 text-right">Precio U. (Q)</div>
        <div className="col-span-1 text-right">Total (Q)</div>
        <div className="col-span-1" />
      </div>

      {/* items */}
      <div className="md:divide-y md:divide-[var(--chip-ring)]/80">
        <SortableList ids={group.items.map((it) => `${group.id}::${it.id}`)}>
          {group.items.map((it, ii) => (
            <SortableItem key={it.id} id={`${group.id}::${it.id}`}>
              <ItemRow
                groupId={group.id}
                item={it}
                itemIndex={ii}
                autoFocus={it.id === autofocusId} // NEW
                onUpdate={(idx, patch) => onUpdateItem(groupIndex, idx, patch)}
                onRemove={(idx) => onRemoveItem(groupIndex, idx)}
              />
            </SortableItem>
          ))}
        </SortableList>
      </div>

      <div className="pt-1">
        <Button onClick={() => onAddItem(groupIndex)}>+ Añadir ítem</Button>
      </div>
    </Card>
  );
}

export const GroupCard = React.memo(GroupCardBase);
