CREATE OR REPLACE FUNCTION public.stock_entry_is_valid(_sheet_date date, _row_id text, _cells jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT _sheet_date >= (current_date - interval '2 years')::date
     AND _sheet_date <= (current_date + interval '1 year')::date
     AND _row_id ~ '^[a-zA-Z0-9_-]{1,64}$'
     AND jsonb_typeof(_cells) = 'object'
     AND (SELECT count(*) FROM jsonb_object_keys(_cells)) <= 32
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_each(_cells) AS kv(k, v)
       WHERE kv.k !~ '^[a-zA-Z0-9_]{1,32}$'
          OR jsonb_typeof(kv.v) <> 'string'
          OR length(kv.v #>> '{}') > 32
     )
$$;

DROP POLICY IF EXISTS "Anyone can add stock entries" ON public.stock_entries;
DROP POLICY IF EXISTS "Anyone can update stock entries" ON public.stock_entries;
DROP POLICY IF EXISTS "Anyone can delete stock entries" ON public.stock_entries;

CREATE POLICY "Validated stock entry inserts"
ON public.stock_entries FOR INSERT
WITH CHECK (public.stock_entry_is_valid(sheet_date, row_id, cells));

CREATE POLICY "Validated stock entry updates"
ON public.stock_entries FOR UPDATE
USING (sheet_date >= (current_date - interval '2 years')::date)
WITH CHECK (public.stock_entry_is_valid(sheet_date, row_id, cells));

REVOKE DELETE ON public.stock_entries FROM anon, authenticated;