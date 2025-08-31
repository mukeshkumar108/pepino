# Pepino — Invoices & Proposals

Tiny web app to create beautiful proposals/invoices fast, then export pixel-perfect PDFs with Ashley’s branding.

Live: https://pepino.vercel.app

## ✨ Features

- Login via Supabase (magic link & password supported)
- Invoice statuses with chips: Draft / Proposal / Invoice / Paid
- Client + Event details (name, address, date, location)
- Groups & line items with **drag & drop** (dnd-kit)
- “Magic input” → paste free text, auto-parse into items
- Quick tax presets: **0% / 5% / 17%**
- Autosave, duplicate, delete
- **PDF export** (pdf-lib):
  - Branded header bar + logo
  - Poppins font (embedded, PDF-only)
  - Large “Detalle / Ítems” section heading
  - Clear dividers & spacing, right-aligned totals
  - Optional footer note, client signature line
  - Ashley’s stamp/signature image + printed name
- Default Spanish terms (one-click insert)

## 🧰 Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS (utility classes in `globals.css`)
- Supabase Auth (SSR cookies via route handler)
- pdf-lib (+ fontkit) for custom PDFs
- @dnd-kit for drag & drop
- Geist (UI font), **Poppins** (PDF font)
