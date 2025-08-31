import React, { createContext, useContext, forwardRef } from "react";
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DraggableAttributes,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Minimal, rule-safe listener type (no `any`)
type DragListeners = { [key: string]: (...args: unknown[]) => void };

type HandleCtx = {
  attributes: DraggableAttributes;
  listeners: DragListeners | undefined;
} | null;

const SortableItemCtx = createContext<HandleCtx>(null);

export function SortableList({
  ids,
  children,
}: {
  ids: string[];
  children: React.ReactNode;
}) {
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      {children}
    </SortableContext>
  );
}

export function SortableItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SortableItemCtx.Provider
      value={{ attributes, listeners: listeners as DragListeners }}
    >
      <div
        ref={setNodeRef}
        style={style}
        className={isDragging ? "opacity-70" : undefined}
      >
        {children}
      </div>
    </SortableItemCtx.Provider>
  );
}

// Make only this element the drag handle
export const DragHandle = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(function DragHandle({ className = "", children, ...rest }, ref) {
  const ctx = useContext(SortableItemCtx);
  return (
    <button
      ref={ref}
      type="button"
      {...(ctx?.attributes ?? {})}
      {...(ctx?.listeners ?? {})}
      className={`cursor-grab touch-none select-none ${className}`}
      aria-label="Arrastrar para reordenar"
      {...rest}
    >
      {children}
    </button>
  );
});

// ONE sensor for mouse + touch (works in DevTools + phones)
export function useDndSensors(opts?: {
  pointer?: { delay?: number; tolerance?: number; distance?: number };
}) {
  // Choose EITHER distance OR delay/tolerance
  const activationConstraint =
    opts?.pointer?.distance != null
      ? { distance: opts.pointer.distance }
      : {
          delay: opts?.pointer?.delay ?? 220,
          tolerance: opts?.pointer?.tolerance ?? 8,
        };

  return useSensors(
    useSensor(PointerSensor, { activationConstraint }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
}
