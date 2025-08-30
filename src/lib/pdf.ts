// src/lib/pdf.ts
import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import type { Invoice } from "./invoiceSchema";
import { invoiceTotalsQ } from "./totals";

export type PdfOptions = {
  /** Header document title (e.g., "Propuesta", "Factura", "Pagada") */
  title?: string;
  /** Absolute or relative URL (e.g., "/logo.png") */
  logoUrl?: string;
  /** data: URL for logo (preferred if you already have it in memory) */
  logoDataUrl?: string;
  /** Footer small note, shown on every page */
  footerNote?: string;
  /** Header bar color (defaults to #161616) */
  headerColorHex?: string;
};

// --- tiny utils ---
function hexToRgb(hex: string) {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return rgb(r / 255, g / 255, b / 255);
}

function wrapText(text: string, maxChars: number): string[] {
  const words = (text ?? "").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (!w) continue;
    const candidate = line ? line + " " + w : w;
    if (candidate.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function splitParagraphs(s: string): string[] {
  return (s ?? "").split(/\r?\n\r?\n/);
}

function isBulletLine(s: string): boolean {
  return /^\s*([-*•]|\d+\.)\s+/.test(s);
}

// Decode a data URL -> Uint8Array
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const [, , b64] = dataUrl.match(/^data:(.*?);base64,(.*)$/) || [];
  if (!b64) return new Uint8Array();
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// --- core PDF generation ---
export async function generateInvoicePdf(inv: Invoice, opts: PdfOptions = {}): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const pageSize: [number, number] = [595.28, 841.89]; // A4
  const [pageWidth, pageHeight] = pageSize;

  const marginX = 40;
  const left = marginX;
  const right = pageWidth - marginX;

  const headerHeight = 64;
  const footerHeight = 26;
  const contentTopY = pageHeight - headerHeight - 20;  // start below header
  const contentMinY = 80 + footerHeight;               // keep above footer

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const drawText = (
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    size = 10,
    bold = false,
    color = rgb(0, 0, 0)
  ) => {
    page.drawText(text ?? "", { x, y, size, font: bold ? fontBold : font, color });
  };

  // Try to embed a logo if provided
  async function tryEmbedLogo() {
    try {
      let bytes: Uint8Array | null = null;
      if (opts.logoDataUrl) {
        bytes = dataUrlToBytes(opts.logoDataUrl);
      } else if (opts.logoUrl) {
        const res = await fetch(opts.logoUrl);
        const ab = await res.arrayBuffer();
        bytes = new Uint8Array(ab);
      } else {
        // Try default public logo
        const res = await fetch("/rosegold_logo-big--white.png");
        if (res.ok) {
          const ab = await res.arrayBuffer();
          bytes = new Uint8Array(ab);
        }
      }
      if (!bytes) return null;
      try {
        const img = await pdf.embedPng(bytes);
        return { img, type: "png" as const, width: img.width, height: img.height };
      } catch {
        const img = await pdf.embedJpg(bytes);
        return { img, type: "jpg" as const, width: img.width, height: img.height };
      }
    } catch {
      return null;
    }
  }

  const logo = await tryEmbedLogo();
  const headerColor = hexToRgb(opts.headerColorHex ?? "#161616");

  function drawHeader(page: PDFPage) {
    // bar
    page.drawRectangle({
      x: 0,
      y: pageHeight - headerHeight,
      width: pageWidth,
      height: headerHeight,
      color: headerColor,
    });

    // logo (left)
    if (logo) {
      const maxH = 40;
      const ratio = logo.width / logo.height;
      const h = maxH;
      const w = h * ratio;
      const x = left;
      const y = pageHeight - headerHeight + (headerHeight - h) / 2;
      page.drawImage(logo.img, { x, y, width: w, height: h });
    }

    // title (right)
    const title = opts.title || "Propuesta / Factura";
    drawText(
      page,
      title,
      right - Math.max(120, (title.length * 6)),
      pageHeight - headerHeight + (headerHeight - 12) / 2,
      14,
      true,
      rgb(1, 1, 1)
    );
  }

  function drawFooter(page: PDFPage, pageIndex: number, totalPages: number) {
    // light footer bar
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: footerHeight,
      color: rgb(0.96, 0.96, 0.96),
    });

    // note (left)
    const note = opts.footerNote ?? "";
    if (note) drawText(page, note, left, 8, 8, false, rgb(0.25, 0.25, 0.25));

    // page number (right)
    const pn = `${pageIndex + 1} / ${totalPages}`;
    drawText(page, pn, right - 24, 8, 8, false, rgb(0.25, 0.25, 0.25));
  }

  // Adds a page with header, returns { page, cursorY }
  function addPage(): { page: PDFPage; cursorY: number } {
    const page = pdf.addPage(pageSize);
    drawHeader(page);
    const cursorY = contentTopY;
    return { page, cursorY };
  }

  let { page, cursorY } = addPage();

  const newPageIfNeeded = () => {
    if (cursorY < contentMinY) {
      ({ page, cursorY } = addPage());
    }
  };

  // ======= CONTENT =======

  // Client / Event block (two columns; multiline)
  const colWidth = 240;
  const eventColX = right - colWidth;

  drawText(page, "Cliente", left, cursorY, 10, true);
  drawText(page, "Evento", eventColX, cursorY, 10, true);
  cursorY -= 14;

  const startClientY = cursorY;
  const startEventY = cursorY;

  const drawMultiline = (
    text: string,
    x: number,
    startY: number,
    opts2?: { lineHeight?: number; size?: number; bold?: boolean; maxChars?: number }
  ) => {
    const lineHeight = opts2?.lineHeight ?? 12;
    const size = opts2?.size ?? 10;
    const bold = opts2?.bold ?? false;
    const maxChars = opts2?.maxChars ?? 42;

    let y = startY;
    const lines = (text ?? "").split(/\r?\n/);
    for (const raw of lines) {
      if (raw === "") {
        y -= lineHeight;
        continue;
      }
      const wrapped = wrapText(raw, maxChars);
      for (const line of wrapped) {
        drawText(page, line, x, y, size, bold);
        y -= lineHeight;
      }
    }
    return y;
  };

  // Left: client
  let yClient = startClientY;
  drawText(page, inv.client.name || "", left, yClient);
  yClient -= 12;
  if (inv.client.address && inv.client.address.trim()) {
    yClient = drawMultiline(inv.client.address, left, yClient, { maxChars: 42 });
  }

  // Right: event
  let yEvent = startEventY;
  if (inv.event?.name) { drawText(page, inv.event.name, eventColX, yEvent); yEvent -= 12; }
  if (inv.event?.date) { drawText(page, inv.event.date, eventColX, yEvent); yEvent -= 12; }
  if (inv.event?.location && inv.event.location.trim()) {
    yEvent = drawMultiline(inv.event.location, eventColX, yEvent, { maxChars: 42 });
  }

  cursorY = Math.min(yClient, yEvent) - 8;

  // Groups / items
  inv.groups.forEach((g) => {
    newPageIfNeeded();
    drawText(page, g.title, left, cursorY, 12, true);
    cursorY -= 16;

    drawText(page, "CANT", left, cursorY, 10, true);
    drawText(page, "Descripción", left + 60, cursorY, 10, true);
    drawText(page, "Precio U.", right - 150, cursorY, 10, true);
    drawText(page, "Total", right - 70, cursorY, 10, true);
    cursorY -= 14;

    g.items.forEach((it) => {
      newPageIfNeeded();

      const qtyX = left;
      const descX = left + 60;
      const unitX = right - 150;
      const totalX = right - 70;

      const descLines = wrapText(it.desc ?? "", 80);
      const rowHeight = 14 * Math.max(1, descLines.length);

      drawText(page, String(it.qty), qtyX, cursorY);
      drawText(page, `Q ${Number(it.unit.amount ?? 0).toFixed(2)}`, unitX, cursorY);
      drawText(page, `Q ${(Number(it.qty ?? 0) * Number(it.unit.amount ?? 0)).toFixed(2)}`, totalX, cursorY);

      let y = cursorY;
      for (const line of descLines) {
        drawText(page, line, descX, y);
        y -= 14;
      }

      cursorY -= rowHeight;
    });

    cursorY -= 8;
  });

  // Totals
  const { subtotal, tax, total } = invoiceTotalsQ(inv);
  cursorY -= 6;
  drawText(page, "SUBTOTAL", right - 150, cursorY, 10, true);
  drawText(page, `Q ${subtotal.toFixed(2)}`, right - 70, cursorY);
  cursorY -= 14;
  drawText(page, "IMPUESTOS", right - 150, cursorY, 10, true);
  drawText(page, `Q ${tax.toFixed(2)}`, right - 70, cursorY);
  cursorY -= 16;
  drawText(page, "TOTAL", right - 150, cursorY, 12, true);
  drawText(page, `Q ${total.toFixed(2)}`, right - 70, cursorY, 12, true);
  cursorY -= 16;

  if (inv.secondaryCurrency?.rateNote) {
    drawText(page, inv.secondaryCurrency.rateNote, right - 200, cursorY);
    cursorY -= 14;
  }

  // Bank details
  if (inv.bank?.gtq || inv.bank?.usd) {
    cursorY -= 10;
    drawText(page, "Datos bancarios", left, cursorY, 12, true);
    cursorY -= 16;
    if (inv.bank?.gtq) {
      drawText(
        page,
        `Q: ${inv.bank.gtq.bank} – ${inv.bank.gtq.type} – ${inv.bank.gtq.account} – ${inv.bank.gtq.name}`,
        left,
        cursorY
      );
      cursorY -= 14;
    }
    if (inv.bank?.usd) {
      drawText(
        page,
        `USD: ${inv.bank.usd.bank} – ${inv.bank.usd.type} – ${inv.bank.usd.account} – ${inv.bank.usd.name}`,
        left,
        cursorY
      );
      cursorY -= 14;
    }
  }

  // Notes
  if (inv.notes && inv.notes.trim().length) {
    cursorY -= 10;
    drawText(page, "Notas", left, cursorY, 12, true);
    cursorY -= 16;

    const wrapped = wrapText(inv.notes.replace(/\s+/g, " ").trim(), 96);
    wrapped.forEach((line) => {
      newPageIfNeeded();
      drawText(page, line, left, cursorY);
      cursorY -= 12;
    });
  }

  // Terms
  if (inv.terms && inv.terms.trim().length) {
    cursorY -= 10;
    drawText(page, "Condiciones del servicio", left, cursorY, 12, true);
    cursorY -= 16;

    const paragraphs = splitParagraphs(inv.terms);
    paragraphs.forEach((para) => {
      newPageIfNeeded();

      const rawLines = para.split(/\r?\n/);
      const bulletMode = rawLines.some((l) => isBulletLine(l));

      if (bulletMode) {
        rawLines.forEach((l) => {
          newPageIfNeeded();
          if (!l.trim()) { cursorY -= 6; return; }
          const text = l.replace(/^\s*([-*•]|\d+\.)\s+/, "");
          const wrapped = wrapText(text, 88);
          drawText(page, "•", left, cursorY);
          drawText(page, wrapped[0], left + 14, cursorY);
          cursorY -= 12;
          for (let i = 1; i < wrapped.length; i++) {
            newPageIfNeeded();
            drawText(page, wrapped[i], left + 14, cursorY);
            cursorY -= 12;
          }
        });
      } else {
        const wrapped = wrapText(para.replace(/\s+/g, " ").trim(), 96);
        wrapped.forEach((line) => {
          newPageIfNeeded();
          drawText(page, line, left, cursorY);
          cursorY -= 12;
        });
      }

      cursorY -= 6;
    });
  }

  // Signature
  cursorY -= 10;
  drawText(page, "Confirmación de presupuesto", left, cursorY, 12, true);
  cursorY -= 16;
  drawText(page, "Firma: ________________________________", left, cursorY);

  // Footer on every page
  const pages = pdf.getPages();
  pages.forEach((p, i) => drawFooter(p, i, pages.length));

  const bytes = await pdf.save();
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);
  return new Blob([ab], { type: "application/pdf" });
}

// --- browser helpers ---
export async function downloadInvoicePdf(inv: Invoice, opts?: PdfOptions) {
  const blob = await generateInvoicePdf(inv, opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${(inv.client.name || "cliente").replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function openInvoicePdf(inv: Invoice, opts?: PdfOptions) {
  const blob = await generateInvoicePdf(inv, opts);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
