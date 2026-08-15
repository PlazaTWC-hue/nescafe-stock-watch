CREATE TABLE public.stock_entries (
  sheet_date date NOT NULL,
  row_id text NOT NULL,
  cells jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sheet_date, row_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_entries TO authenticated;
GRANT ALL ON public.stock_entries TO service_role;

ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stock entries" ON public.stock_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can add stock entries" ON public.stock_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update stock entries" ON public.stock_entries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete stock entries" ON public.stock_entries FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.touch_stock_entries_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER stock_entries_updated_at BEFORE UPDATE ON public.stock_entries
FOR EACH ROW EXECUTE FUNCTION public.touch_stock_entries_updated_at();

ALTER TABLE public.stock_entries REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_entries;