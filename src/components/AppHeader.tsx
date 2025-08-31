import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200 w-full overflow-x-hidden [touch-action:pan-y]">
      <div className="mx-auto max-w-4xl w-full h-14 px-4 flex items-center gap-4 [padding-left:env(safe-area-inset-left)] [padding-right:env(safe-area-inset-right)]">
        <Link href="/app" className="font-semibold text-neutral-900">
          Factura Mágica
        </Link>
        <nav className="ml-auto flex items-center gap-3 overflow-x-hidden">
          <Link
            href="/app/invoices/new"
            className="text-neutral-900 border border-neutral-300 rounded px-3 py-1.5 hover:bg-neutral-50"
          >
            Nueva factura
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
