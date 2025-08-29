import { z } from "zod";

export const Money = z.object({
  amount: z.number().nonnegative(),
  currency: z.enum(["GTQ", "USD"]),
});
export type Money = z.infer<typeof Money>;

export const LineItem = z.object({
  id: z.string(),
  qty: z.number().int().nonnegative(),
  desc: z.string(),
  unit: Money,
  notes: z.string().optional(),
});
export type LineItem = z.infer<typeof LineItem>;

export const Group = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(LineItem),
});
export type Group = z.infer<typeof Group>;

export const Invoice = z.object({
  id: z.string(),
  meta: z.object({
    issuedAt: z.string(),
    locale: z.enum(["es-GT"]),
    number: z.string().optional(),
    series: z.string().optional(),
  }),
  client: z.object({
    name: z.string(),
    contact: z.string().optional(),
    dpi: z.string().optional(),
  }),
  event: z
    .object({
      name: z.string().optional(),
      date: z.string().optional(),
      location: z.string().optional(),
    })
    .optional(),
  groups: z.array(Group),
  tax: z.object({ rate: z.number().min(0).max(0.25) }),
  currency: z.enum(["GTQ"]),
  secondaryCurrency: z
    .object({ code: z.literal("USD"), rateNote: z.string().optional() })
    .optional(),
  bank: z
    .object({
      gtq: z
        .object({
          bank: z.string(),
          type: z.string(),
          account: z.string(),
          name: z.string(),
        })
        .optional(),
      usd: z
        .object({
          bank: z.string(),
          type: z.string(),
          account: z.string(),
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
  terms: z.string().optional(), // << changed: free text
  notes: z.string().optional(),
});
export type Invoice = z.infer<typeof Invoice>;

// Update the example to use a single string for terms
export const exampleInvoice: Invoice = {
  id: "inv-demo-1",
  meta: { issuedAt: new Date().toISOString().slice(0, 10), locale: "es-GT" },
  client: { name: "FAUSTO CASTILLO" },
  event: { name: "FERCO Z10", date: "2025-05-15", location: "Guatemala" },
  groups: [
    {
      id: "grp-1",
      title: "Mobiliario",
      items: [
        { id: "it-1", qty: 16, desc: "Mesas cocteleras mantel negro", unit: { amount: 75, currency: "GTQ" } },
        { id: "it-2", qty: 70, desc: "Bancos metálicos Tolix", unit: { amount: 20, currency: "GTQ" } },
      ],
    },
    {
      id: "grp-2",
      title: "Logística",
      items: [
        { id: "it-3", qty: 1, desc: "Transporte y personal apoyo montaje", unit: { amount: 1500, currency: "GTQ" } },
      ],
    },
  ],
  tax: { rate: 0 },
  currency: "GTQ",
  secondaryCurrency: { code: "USD", rateNote: "CAMBIO Q.8" },
  bank: {
    gtq: { bank: "BI", type: "MONETARIA", account: "1940035790", name: "ASHLEY AYALA CORDON" },
    usd:  { bank: "BI", type: "MONETARIA USD", account: "1940063082", name: "ASHLEY AYALA CORDON" },
  },
  terms: [
    "Precios más IVA / IMPUESTOS.",
    "Para confirmar el servicio pagar 100% antes de iniciar.",
  ].join("\n"), // << now one string with newlines
  notes: "Propuesta según cambios y ajustes.",
};
