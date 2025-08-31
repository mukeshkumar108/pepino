import type { Invoice, Group } from "./invoiceSchema";

export function groupTotalQ(group: Group): number {
  return group.items.reduce((sum, it) => sum + it.qty * it.unit.amount, 0);
}

export function invoiceTotalsQ(inv: Invoice): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const subtotal = inv.groups.reduce((s, g) => s + groupTotalQ(g), 0);
  const tax = Math.round(subtotal * inv.tax.rate * 100) / 100;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}
