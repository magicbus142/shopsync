-- Add initial_stock to products if it doesn't exist
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'products' and column_name = 'initial_stock') then
    alter table products add column initial_stock integer default 0;
  end if;
end $$;
