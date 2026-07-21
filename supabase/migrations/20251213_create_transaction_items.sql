create table if not exists transaction_items (
  id uuid default gen_random_uuid() primary key,
  transaction_id uuid references transactions(id) on delete cascade not null,
  product_id uuid references products(id),
  quantity integer not null default 1,
  price_per_unit numeric not null default 0,
  total_price numeric not null default 0,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table transaction_items enable row level security;

-- Policy for authenticated users
create policy "Users can manage their own transaction items"
  on transaction_items for all
  using (
    exists (
      select 1 from transactions
      where transactions.id = transaction_items.transaction_id
      and transactions.user_id = auth.uid()
    )
  );

-- Fix RLS for transaction_payments if needed (based on previous check showing rowsecurity: false this might be redundant but good for safety)
alter table transaction_payments enable row level security;

create policy "Users can manage their own transaction payments"
  on transaction_payments for all
  using (
    exists (
      select 1 from transactions
      where transactions.id = transaction_payments.transaction_id
      and transactions.user_id = auth.uid()
    )
  );
