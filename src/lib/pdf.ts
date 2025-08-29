// src/lib/pdf.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Invoice } from "./invoiceSchema";
import { invoiceTotalsQ } from "./totals";

// --- text helpers ---
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
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
  // blank line separates paragraphs
  return s.split(/\r?\n\r?\n/);
}

function isBulletLine(s: string): boolean {
  return /^\s*([-*•]|\d+\.)\s+/.test(s);
}

// --- core PDF generation ---
export async function generateInvoicePdf(inv: Invoice): Promise<Blob> {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]); // A4 in points
  const { width } = page.getSize();

  const marginX = 40;
  let cursorY = 800;
  const left = marginX;
  const right = width - marginX;

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const drawText = (text: string, x: number, y: number, size = 10, bold = false) => {
    page.drawText(text ?? "", {
      x,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
  };

  const newPageIfNeeded = (minY = 80) => {
    if (cursorY < minY) {
      page = pdf.addPage([595.28, 841.89]);
      cursorY = 800;
    }
  };

  // Header
  drawText("Propuesta / Factura", left, cursorY, 16, true);
  cursorY -= 22;

  // Client / Event block
  drawText("Cliente", left, cursorY, 10, true);
  drawText(inv.client.name || "", left, cursorY - 14);
  drawText("Evento", right - 200, cursorY, 10, true);
  drawText(inv.event?.name || "", right - 200, cursorY - 14);
  drawText(inv.event?.date || "", right - 200, cursorY - 28);
  drawText(inv.event?.location || "", right - 200, cursorY - 42);
  cursorY -= 62;

  // Groups / items table
  inv.groups.forEach((g) => {
    newPageIfNeeded();
    drawText(g.title, left, cursorY, 12, true);
    cursorY -= 16;

    drawText("CANT", left, cursorY, 10, true);
    drawText("Descripción", left + 60, cursorY, 10, true);
    drawText("Precio U.", right - 150, cursorY, 10, true);
    drawText("Total", right - 70, cursorY, 10, true);
    cursorY -= 14;

    g.items.forEach((it) => {
      newPageIfNeeded();
      drawText(String(it.qty), left, cursorY);
      drawText(it.desc, left + 60, cursorY);
      drawText(`Q ${it.unit.amount.toFixed(2)}`, right - 150, cursorY);
      drawText(`Q ${(it.qty * it.unit.amount).toFixed(2)}`, right - 70, cursorY);
      cursorY -= 14;
    });

    cursorY -= 8;
  });

  // Totals
  const { subtotal, tax, total } = invoiceTotalsQ(inv);
  cursorY -= 6;
  drawText("SUBTOTAL", right - 150, cursorY, 10, true);
  drawText(`Q ${subtotal.toFixed(2)}`, right - 70, cursorY);
  cursorY -= 14;
  drawText("IMPUESTOS", right - 150, cursorY, 10, true);
  drawText(`Q ${tax.toFixed(2)}`, right - 70, cursorY);
  cursorY -= 16;
  drawText("TOTAL", right - 150, cursorY, 12, true);
  drawText(`Q ${total.toFixed(2)}`, right - 70, cursorY, 12, true);
  cursorY -= 16;

  if (inv.secondaryCurrency?.rateNote) {
    drawText(inv.secondaryCurrency.rateNote, right - 200, cursorY);
    cursorY -= 14;
  }

  // Bank details
  if (inv.bank?.gtq || inv.bank?.usd) {
    cursorY -= 10;
    drawText("Datos bancarios", left, cursorY, 12, true);
    cursorY -= 16;
    if (inv.bank.gtq) {
      drawText(
        `Q: ${inv.bank.gtq.bank} – ${inv.bank.gtq.type} – ${inv.bank.gtq.account} – ${inv.bank.gtq.name}`,
        left,
        cursorY
      );
      cursorY -= 14;
    }
    if (inv.bank.usd) {
      drawText(
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
    drawText("Notas", left, cursorY, 12, true);
    cursorY -= 16;

    const wrapped = wrapText(inv.notes.replace(/\s+/g, " ").trim(), 96);
    wrapped.forEach((line) => {
      drawText(line, left, cursorY);
      cursorY -= 12;
      newPageIfNeeded();
    });
  }

  // Terms (paragraphs or bullets)
  if (inv.terms && inv.terms.trim().length) {
    cursorY -= 10;
    drawText("Condiciones del servicio", left, cursorY, 12, true);
    cursorY -= 16;

    const paragraphs = splitParagraphs(inv.terms);
    paragraphs.forEach((para) => {
      newPageIfNeeded();

      const rawLines = para.split(/\r?\n/); // keep blanks, line-by-line
      const bulletMode = rawLines.some((l) => isBulletLine(l));

      if (bulletMode) {
        rawLines.forEach((l) => {
          if (!l.trim()) {
            cursorY -= 6; // small gap for blank line inside bullet block
            return;
          }
          const text = l.replace(/^\s*([-*•]|\d+\.)\s+/, "");
          const wrapped = wrapText(text, 88);
          // Bullet gutter
          drawText("•", left, cursorY);
          drawText(wrapped[0], left + 14, cursorY);
          cursorY -= 12;
          for (let i = 1; i < wrapped.length; i++) {
            drawText(wrapped[i], left + 14, cursorY);
            cursorY -= 12;
          }
        });
      } else {
        // Paragraph wrapping
        const wrapped = wrapText(para.replace(/\s+/g, " ").trim(), 96);
        wrapped.forEach((line) => {
          drawText(line, left, cursorY);
          cursorY -= 12;
          newPageIfNeeded();
        });
      }

      cursorY -= 6; // spacing between paragraphs
    });
  }

  cursorY -= 10;
  drawText("Confirmación de presupuesto", left, cursorY, 12, true);
  cursorY -= 16;
  drawText("Firma: ________________________________", left, cursorY);

  const bytes = await pdf.save();

  // Use an ArrayBuffer slice for wide TS/Next/Vercel compatibility
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Blob([ab], { type: "application/pdf" });
}

// --- browser helpers ---
export async function downloadInvoicePdf(inv: Invoice) {
  const blob = await generateInvoicePdf(inv);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${inv.client.name.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function openInvoicePdf(inv: Invoice) {
  const blob = await generateInvoicePdf(inv);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
