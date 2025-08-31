export type ParsedItem = {
  desc: string;
  qty?: number;
  price?: number;
  currency?: "GTQ" | "USD";
};
export type ParsedGroup = { title: string; items: ParsedItem[] };

const Q_RE = /(?:q|quetzal(?:es)?)/i;
const USD_RE = /\b(?:usd|\$)\b/i;

function toNum(s: string | undefined): number | undefined {
  if (!s) return;
  const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return isFinite(n) ? n : undefined;
}

/**
 * Accepts free text like:
 *  Mobiliario:
 *  Sillas 100 x 15
 *  Mesas 10 @ 50
 *
 *  Logística:
 *  Transporte Q2000
 *  Luces 1 x 500
 *
 * Works without groups too; falls back to a default "Items" group.
 */
export function parseFreeText(input: string): ParsedGroup[] {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length);

  if (lines.length === 0) return [];

  const groups: ParsedGroup[] = [];
  let current: ParsedGroup = { title: "Items", items: [] };
  groups.push(current);

  for (const raw of lines) {
    // New group headings: "Mobiliario:" or "# Logística"
    if (/[:：]\s*$/.test(raw) || /^#\s+/.test(raw)) {
      const title = raw
        .replace(/^#\s+/, "")
        .replace(/[:：]\s*$/, "")
        .trim();
      if (title) {
        current = { title, items: [] };
        groups.push(current);
      }
      continue;
    }

    // Detect currency hints
    const currency: "GTQ" | "USD" | undefined = USD_RE.test(raw)
      ? "USD"
      : Q_RE.test(raw) || /Q\b/i.test(raw)
        ? "GTQ"
        : undefined;

    // Strip currency symbols for numeric parsing
    const lc = raw
      .replace(/\b(Q|GTQ|USD|\$)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Pattern: "Desc qty x price" OR "Desc qty @ price"
    let m = lc.match(
      /(.+?)\s+(\d+(?:[.,]\d+)?)\s*(?:x|×|@)\s*(\d+(?:[.,]\d+)?)(?!\S)/i,
    );
    if (m) {
      current.items.push({
        desc: m[1].trim(),
        qty: toNum(m[2]),
        price: toNum(m[3]),
        currency: currency ?? "GTQ",
      });
      continue;
    }

    // Pattern: leading qty → "10 Mesas 50"
    m = lc.match(/^(\d+(?:[.,]\d+)?)\s+(.+?)\s+(\d+(?:[.,]\d+)?)$/);
    if (m) {
      current.items.push({
        qty: toNum(m[1]),
        desc: m[2].trim(),
        price: toNum(m[3]),
        currency: currency ?? "GTQ",
      });
      continue;
    }

    // Pattern: "Transporte 2000"
    m = lc.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)$/);
    if (m) {
      current.items.push({
        desc: m[1].trim(),
        qty: 1,
        price: toNum(m[2]),
        currency: currency ?? "GTQ",
      });
      continue;
    }

    // Fallback: description only → qty=1, price undefined
    current.items.push({ desc: raw, qty: 1, currency: currency ?? "GTQ" });
  }

  // Drop empty groups
  return groups.filter((g) => g.items.length > 0);
}
