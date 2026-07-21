-- Add price to products if it doesn't exist
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'products' and column_name = 'price') then
    alter table products add column price numeric default 0;
  end if;
end $$;
