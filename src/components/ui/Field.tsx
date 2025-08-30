export function Field({ label, children }: {label?: string; children: React.ReactNode}) {
  return (
    <label className="block space-y-1">
      {label && <span className="text-sm font-medium text-gray-800">{label}</span>}
      {children}
    </label>
  );
}
