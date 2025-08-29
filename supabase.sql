do $$ begin
  create type invoice_status as enum ('draft','quote','invoice','paid','canceled');
exception when duplicate_object then null; end $$;

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  issued_at date not null default current_date,
  due_date date,
  number text,
  series text,
  client_name text not null,
  event_name text,
  event_date date,
  event_location text,
  tax_rate numeric not null default 0,
  currency text not null default 'GTQ',
  secondary_currency text,
  secondary_note text,
  notes text,
  bank_gtq jsonb,
  bank_usd jsonb,
  status invoice_status not null default 'draft',
  cached_total_q numeric default 0,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoice_groups (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  title text not null,
  position int not null default 0
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references invoice_groups(id) on delete cascade,
  qty int not null default 0,
  descr text not null,
  unit_amount_q numeric not null default 0,
  position int not null default 0
);

create index if not exists idx_invoices_user_status on invoices(user_id, status);
create index if not exists idx_groups_invoice on invoice_groups(invoice_id);
create index if not exists idx_items_group on invoice_items(group_id);

alter table invoices enable row level security;
alter table invoice_groups enable row level security;
alter table invoice_items enable row level security;

create policy "owner can read/write invoices"
on invoices for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "owner can read/write groups"
on invoice_groups for all
using (exists (select 1 from invoices i where i.id = invoice_groups.invoice_id and i.user_id = auth.uid()))
with check (exists (select 1 from invoices i where i.id = invoice_groups.invoice_id and i.user_id = auth.uid()));

create policy "owner can read/write items"
on invoice_items for all
using (exists (
  select 1 from invoice_groups g
  join invoices i on i.id = g.invoice_id
  where g.id = invoice_items.group_id and i.user_id = auth.uid()
))
with check (exists (
  select 1 from invoice_groups g
  join invoices i on i.id = g.invoice_id
  where g.id = invoice_items.group_id and i.user_id = auth.uid()
));