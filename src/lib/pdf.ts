// src/lib/pdf.ts
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
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
  itemsHeading?: string; // heading above the items table
  signerName?: string; // printed under signature line (optional)
  signerTitle?: string; // e.g. company name / role (optional)
  signatureUrl?: string; // e.g. "/signature.png"
  signatureDataUrl?: string; // data: URL if you have it in memory
  signaturePrintedName?: string; // e.g. "DI Ashley Ayala"
};

// --- tiny utils ---
function hexToRgb(hex: string) {
  const m = hex.replace("#", "");
  const n = parseInt(
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m,
    16,
  );
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
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
export async function generateInvoicePdf(
  inv: Invoice,
  opts: PdfOptions = {},
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const pageSize: [number, number] = [595.28, 841.89]; // A4
  const [pageWidth, pageHeight] = pageSize;

  const marginX = 40;
  const left = marginX;
  const right = pageWidth - marginX;

  const headerHeight = 64;
  const footerHeight = 26;
  const contentTopY = pageHeight - headerHeight - 20; // start below header
  const contentMinY = 80 + footerHeight; // keep above footer

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
        return {
          img,
          type: "png" as const,
          width: img.width,
          height: img.height,
        };
      } catch {
        const img = await pdf.embedJpg(bytes);
        return {
          img,
          type: "jpg" as const,
          width: img.width,
          height: img.height,
        };
      }
    } catch {
      return null;
    }
  }
  const logo = await tryEmbedLogo();

  //Embed signature if provided
  async function tryEmbedSignature() {
    try {
      let bytes: Uint8Array | null = null;
      if (opts.signatureDataUrl) {
        // reuse your existing dataUrl -> bytes util
        bytes = dataUrlToBytes(opts.signatureDataUrl);
      } else if (opts.signatureUrl) {
        const res = await fetch(opts.signatureUrl);
        const ab = await res.arrayBuffer();
        bytes = new Uint8Array(ab);
      }
      if (!bytes) return null;
      try {
        const img = await pdf.embedPng(bytes);
        return { img, width: img.width, height: img.height };
      } catch {
        const img = await pdf.embedJpg(bytes);
        return { img, width: img.width, height: img.height };
      }
    } catch {
      return null;
    }
  }
  const signature = await tryEmbedSignature();

  const headerColor = hexToRgb(opts.headerColorHex ?? "#161616");
  const lineColor = rgb(0.85, 0.86, 0.9);

  // Use Poppins for the PDF only
  pdf.registerFontkit(fontkit);

  async function fetchFont(path: string): Promise<Uint8Array | null> {
    try {
      const res = await fetch(path);
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      return new Uint8Array(ab);
    } catch {
      return null;
    }
  }

  const poppinsRegularBytes = await fetchFont("/fonts/Poppins-Regular.ttf");
  const poppinsMediumBytes = await fetchFont("/fonts/Poppins-Medium.ttf");
  const poppinsSemiBytes = await fetchFont("/fonts/Poppins-SemiBold.ttf"); // optional

  const fontRegular = poppinsRegularBytes
    ? await pdf.embedFont(poppinsRegularBytes, { subset: true })
    : undefined;
  const fontMedium = poppinsMediumBytes
    ? await pdf.embedFont(poppinsMediumBytes, { subset: true })
    : fontRegular;
  const fontSemi = poppinsSemiBytes
    ? await pdf.embedFont(poppinsSemiBytes, { subset: true })
    : fontMedium;

  // drop-in replacement for your old drawText() that supported bold=true/false
  function drawText(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    size = 10,
    bold = false,
    color = rgb(0, 0, 0),
  ) {
    const f = bold
      ? fontSemi || fontMedium || fontRegular
      : fontRegular || fontMedium || fontSemi;
    page.drawText(text ?? "", { x, y, size, font: f!, color });
  }
  // Load a font that includes accented chars (not all do)
  // Helpers for measuring and right-aligning text
  const pickFont = (bold = false) =>
    (bold
      ? fontSemi || fontMedium || fontRegular
      : fontRegular || fontMedium || fontSemi)!;

  function measure(text: string, size: number, bold = false) {
    const f = pickFont(bold);
    return f.widthOfTextAtSize(text ?? "", size);
  }

  function drawRight(
    page: PDFPage,
    text: string,
    rightX: number,
    y: number,
    size = 10,
    bold = false,
    color = rgb(0, 0, 0),
  ) {
    const f = pickFont(bold);
    const w = measure(text, size, bold);
    page.drawText(text ?? "", { x: rightX - w, y, size, font: f, color });
  }

  // Formats "2024-12-31" -> "31/12/2024"; returns "" if input is falsy
  function formatDate(iso?: string): string {
    if (!iso) return "";
    const [y, m, d] = (iso ?? "").split("-");
    return d && m && y ? `${d}/${m}/${y}` : (iso ?? "");
  }

  // Draws the invoice meta in the top-right and returns the new cursorY
  function drawInvoiceMeta(page: PDFPage, startY: number): number {
    const s = 10; // uniform size
    const b = false; // uniform weight (not bold)
    const lineGap = 12; // spacing between lines
    const blockGap = 10; // extra space after the block

    const num = inv.meta?.number ? `N.º ${inv.meta.number}` : null;
    const fecha = inv.meta?.issuedAt
      ? `Fecha: ${formatDate(inv.meta.issuedAt)}`
      : null;
    const vence = inv.meta?.dueAt
      ? `Vence: ${formatDate(inv.meta.dueAt)}`
      : null;

    const lines = [num, fecha, vence].filter(Boolean) as string[];

    let y = startY;
    for (const t of lines) {
      drawRight(page, t, right, y, s, b);
      y -= lineGap;
    }
    return y - blockGap;
  }

  // Wraps a single token (word) by width if needed
  function breakTokenByWidth(
    token: string,
    maxWidth: number,
    size = 10,
    bold = false,
  ): string[] {
    // Breaks a single super-long word into pieces that fit
    const pieces: string[] = [];
    let cur = "";
    for (const ch of token.split("")) {
      const next = cur + ch;
      if (measure(next, size, bold) <= maxWidth) {
        cur = next;
      } else {
        if (cur) pieces.push(cur);
        cur = ch;
      }
    }
    if (cur) pieces.push(cur);
    return pieces.length ? pieces : [token];
  }

  function wrapByWidth(
    text: string,
    maxWidth: number,
    size = 10,
    bold = false,
  ): string[] {
    const words = (text ?? "").split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";

    for (const w of words) {
      // If a single word is wider than the column, break it
      if (measure(w, size, bold) > maxWidth) {
        const chunks = breakTokenByWidth(w, maxWidth, size, bold);
        for (const c of chunks) {
          if (!line) {
            line = c;
          } else {
            const trial = line + " " + c;
            if (measure(trial, size, bold) <= maxWidth) {
              line = trial;
            } else {
              lines.push(line);
              line = c;
            }
          }
        }
        continue;
      }

      // Normal word flow
      if (!line) {
        line = w;
        continue;
      }
      const trial = line + " " + w;
      if (measure(trial, size, bold) <= maxWidth) {
        line = trial;
      } else {
        lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

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

    // title (right) — anchor to the header bar edge (pageWidth), not content "right"
    const title = opts.title || "Propuesta / Factura";
    const titleY = pageHeight - headerHeight + (headerHeight - 12) / 2; // small breathing room from the edge
    drawRight(page, title, right, titleY, 14, true, rgb(1, 1, 1));
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

  cursorY = drawInvoiceMeta(page, cursorY);

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
    opts2?: {
      lineHeight?: number;
      size?: number;
      bold?: boolean;
      maxChars?: number;
    },
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
    yClient = drawMultiline(inv.client.address, left, yClient, {
      maxChars: 42,
    });
  }

  // Right: event
  let yEvent = startEventY;
  if (inv.event?.name) {
    drawText(page, inv.event.name, eventColX, yEvent);
    yEvent -= 12;
  }
  if (inv.event?.date) {
    drawText(page, inv.event.date, eventColX, yEvent);
    yEvent -= 12;
  }
  if (inv.event?.location && inv.event.location.trim()) {
    yEvent = drawMultiline(inv.event.location, eventColX, yEvent, {
      maxChars: 42,
    });
  }

  cursorY = Math.min(yClient, yEvent) - 8;

  // Divider + section heading (extra breathing room + larger title)
  page.drawRectangle({
    x: left,
    y: cursorY - 6,
    width: right - left,
    height: 0.8,
    color: lineColor,
  });

  // generous spacing BEFORE the heading (a full line break feel)
  const headingSize = 20; // bigger title
  const beforeHeadingGap = 32; // space from divider to heading baseline
  const afterHeadingGap = 24; // space after heading before first group

  cursorY -= beforeHeadingGap;

  // not bold, but large; change `false` -> `true` if you want it semi-bold
  drawText(
    page,
    opts.itemsHeading ?? "Detalle / Ítems",
    left,
    cursorY,
    headingSize,
    false,
  );

  // generous spacing AFTER the heading (so first group isn't flush)
  cursorY -= afterHeadingGap;

  // Groups / items
  inv.groups.forEach((g) => {
    newPageIfNeeded();
    drawText(page, g.title, left, cursorY, 12, true);
    cursorY -= 16;

    // Header band
    const headerY = cursorY;
    page.drawRectangle({
      x: left,
      y: headerY - 2,
      width: right - left,
      height: 16,
      color: rgb(0.96, 0.97, 1.0),
    });

    // fixed right edges for the amounts (headers + rows share these)
    const unitRight = right - 120;
    const totalRight = right;

    drawText(page, "CANT", left, headerY, 10, true);
    drawText(page, "Descripción", left + 60, headerY, 10, true);
    drawRight(page, "Precio U.", unitRight, headerY, 10, true);
    drawRight(page, "Total", totalRight, headerY, 10, true);
    cursorY -= 14;

    g.items.forEach((it) => {
      newPageIfNeeded();

      const qtyX = left;
      const descX = left + 60;

      // description column ends before the unit price column
      const descColWidth = unitRight - descX - 8;

      // wrap description by measured width (so it never hits the numbers)
      const descLines = wrapByWidth(it.desc ?? "", descColWidth, 10, false);
      const rowHeight = 14 * Math.max(1, descLines.length);

      const unitAmt = Number(it.unit.amount ?? 0);
      const lineTot = Number(it.qty ?? 0) * unitAmt;

      drawText(page, String(it.qty), qtyX, cursorY);
      drawRight(page, `Q ${unitAmt.toFixed(2)}`, unitRight, cursorY, 10, false);
      drawRight(
        page,
        `Q ${lineTot.toFixed(2)}`,
        totalRight,
        cursorY,
        10,
        false,
      );

      // multi-line description in its column
      let y = cursorY;
      for (const line of descLines) {
        drawText(page, line, descX, y);
        y -= 14;
      }

      cursorY -= rowHeight;
    });

    cursorY -= 8; // spacing after group
  });

  // Divider before totals (after the items list)
  newPageIfNeeded();
  page.drawRectangle({
    x: left,
    y: cursorY - 6,
    width: right - left,
    height: 0.8,
    color: lineColor,
  });
  cursorY -= 12; // spacing after divider

  // Totals
  const { subtotal, tax, total } = invoiceTotalsQ(inv);

  // Build strings
  const subLabel = "SUBTOTAL";
  const taxPct = Math.round((inv.tax?.rate ?? 0) * 100);
  const taxLabel = `IMPUESTOS (${taxPct}%)`;
  const totLabel = "TOTAL";

  const subAmt = `Q ${subtotal.toFixed(2)}`;
  const taxAmt = `Q ${tax.toFixed(2)}`;
  const totAmt = `Q ${total.toFixed(2)}`;

  // Measure to reserve enough room for the widest amount
  const wSub = measure(subAmt, 10, false);
  const wTax = measure(taxAmt, 10, false);
  const wTot = measure(totAmt, 12, true);
  const wAmtMax = Math.max(wSub, wTax, wTot);

  // Columns: amounts flush-right; labels end to the left with a safe gap
  const amountRight = right;
  const gap = 16;
  const labelRight = amountRight - wAmtMax - gap;

  cursorY -= 6;

  drawRight(page, subLabel, labelRight, cursorY, 10, true);
  drawRight(page, subAmt, amountRight, cursorY, 10, false);
  cursorY -= 14;

  drawRight(page, taxLabel, labelRight, cursorY, 10, true);
  drawRight(page, taxAmt, amountRight, cursorY, 10, false);
  cursorY -= 16;

  drawRight(page, totLabel, labelRight, cursorY, 12, true);
  drawRight(page, totAmt, amountRight, cursorY, 12, true);
  cursorY -= 16;

  // Divider after totals (with spacing before & after)
  newPageIfNeeded();
  cursorY -= 8; // spacing BEFORE divider
  page.drawRectangle({
    x: left,
    y: cursorY - 6,
    width: right - left,
    height: 0.8,
    color: lineColor,
  });
  cursorY -= 12; // spacing AFTER divider

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
        cursorY,
      );
      cursorY -= 14;
    }
    if (inv.bank?.usd) {
      drawText(
        page,
        `USD: ${inv.bank.usd.bank} – ${inv.bank.usd.type} – ${inv.bank.usd.account} – ${inv.bank.usd.name}`,
        left,
        cursorY,
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
          if (!l.trim()) {
            cursorY -= 6;
            return;
          }
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

  // Before the signature block
  newPageIfNeeded();

  // ===== Client signature (space for handwriting)
  cursorY -= 14;
  drawText(page, "Confirmación de presupuesto", left, cursorY, 12, true);
  cursorY -= 12;

  cursorY -= 16;
  drawText(page, "Firma: ________________________________", left, cursorY);
  cursorY -= 36;

  // If near the bottom, make sure Ashley's signature doesn't get chopped
  newPageIfNeeded();

  // ===== Ashley's signature/stamp
  if (signature) {
    const maxH = 63; // was 42 — now 1.5x
    const ratio = signature.width / signature.height;
    const h = maxH;
    const w = h * ratio;
    const x = left;
    const y = cursorY - h + 8;
    page.drawImage(signature.img, { x, y, width: w, height: h });
    cursorY = y - 10; // a touch more room under the image
  }

  if (opts.signaturePrintedName) {
    drawText(
      page,
      opts.signaturePrintedName,
      left,
      cursorY,
      9,
      false,
      rgb(0.35, 0.35, 0.35),
    );
    cursorY -= 8;
  }

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
