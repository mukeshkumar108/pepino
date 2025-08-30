// src/components/ui/Card.tsx
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
