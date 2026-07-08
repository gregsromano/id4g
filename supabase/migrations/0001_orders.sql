create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  customer_email text,
  customer_name text,
  amount_total integer,
  size text,
  shipping_name text,
  shipping_address jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
