// src/components/ui/Card.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

export function Card({ className = "", ...props }: any) {
  return (
    <div
      className={
        "rounded-2xl border border-neutral-200 bg-white " +
        className
      }
      {...props}
    />
  );
}
