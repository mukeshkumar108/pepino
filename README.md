# Ashley Invoices — Starter Pack (Tailwind v4 minimal)

This version assumes Tailwind v4 (zero‑config).

## 0) Scaffold app

```bash
npx create-next-app@latest ashley-invoices --ts --eslint --src-dir --app --use-npm --yes
cd ashley-invoices
```

## 1) Install dependencies

```bash
npm i @react-pdf/renderer zod tailwindcss@latest
```

Edit **src/app/globals.css** and add:
```css
@import "tailwindcss";
```

That's all for Tailwind. 🎉

## 2) Copy these files into your project

- `src/lib/invoiceSchema.ts`
- `src/lib/totals.ts`
- `src/pdf/InvoicePDF.tsx`
- `src/app/create/page.tsx`
- `supabase.sql` (optional later)

## 3) Run locally

```bash
npm run dev -p 3000
# open http://localhost:3000/create
```

## 4) Optional Supabase

Same as before — use `supabase.sql` when ready for persistence/auth.