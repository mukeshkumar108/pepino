import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200">
      <div className="mx-auto max-w-4xl h-14 px-4 flex items-center gap-4">
        <Link href="/app" className="font-semibold text-neutral-900">
          Factura Mágica
        </Link>
        <nav className="ml-auto flex items-center gap-3">
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
