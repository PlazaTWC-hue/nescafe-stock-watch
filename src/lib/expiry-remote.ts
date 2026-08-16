import { supabase } from "@/integrations/supabase/client";

/** เก็บรายการของหมดอายุไว้ในตารางเดิม (stock_entries) โดยใช้วันที่พิเศษเป็นที่เก็บรวม */
const EXPIRY_BUCKET = "1900-01-01";

export type ExpiryItem = {
  id: string;
  name: string;
  received: string; // YYYY-MM-DD
  expiry: string; // YYYY-MM-DD
};

type RawRow = { row_id: string; cells: Record<string, string> | null };

export const fetchExpiryItems = async (): Promise<ExpiryItem[]> => {
  const { data, error } = await supabase
    .from("stock_entries")
    .select("row_id,cells")
    .eq("sheet_date", EXPIRY_BUCKET);
  if (error) throw error;

  return ((data ?? []) as RawRow[])
    .map((r) => ({
      id: r.row_id,
      name: r.cells?.name ?? "",
      received: r.cells?.received ?? "",
      expiry: r.cells?.expiry ?? "",
    }))
    .sort((a, b) => a.expiry.localeCompare(b.expiry));
};

export const saveExpiryItem = async (item: ExpiryItem) => {
  const { error } = await supabase.from("stock_entries").upsert(
    {
      sheet_date: EXPIRY_BUCKET,
      row_id: item.id,
      cells: { name: item.name, received: item.received, expiry: item.expiry },
    },
    { onConflict: "sheet_date,row_id" },
  );
  if (error) throw error;
};

export const deleteExpiryItem = async (id: string) => {
  const { error } = await supabase
    .from("stock_entries")
    .delete()
    .eq("sheet_date", EXPIRY_BUCKET)
    .eq("row_id", id);
  if (error) throw error;
};
