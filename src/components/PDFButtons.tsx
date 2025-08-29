"use client";

import { useEffect, useState } from "react";
import { BlobProvider } from "@react-pdf/renderer";
import InvoicePDF from "@/pdf/InvoicePDF";
import type { Invoice } from "@/lib/invoiceSchema";

export default function PDFButtons({ invoice }: { invoice: Invoice }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <BlobProvider document={<InvoicePDF invoice={invoice} />}>
      {({ url, loading }) => (
        <div className="flex gap-3">
          <a
            href={url ?? "#"}
            download={`invoice-${invoice.client.name.replace(/\s+/g, "_")}.pdf`}
            className="px-4 py-2 rounded bg-black text-white"
            aria-disabled={!url || loading}
            onClick={(e) => { if (!url || loading) e.preventDefault(); }}
          >
            {loading ? "Generando PDF..." : "Descargar PDF"}
          </a>
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="px-4 py-2 rounded border">
              Vista previa
            </a>
          ) : (
            <button className="px-4 py-2 rounded border" disabled>
              Preparando vista previa…
            </button>
          )}
        </div>
      )}
    </BlobProvider>
  );
}
