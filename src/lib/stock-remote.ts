import { supabase } from "@/integrations/supabase/client";

import { dateKey, type SheetValues } from "./stock-sheet";

type EntryRow = {
  sheet_date: string;
  row_id: string;
  cells: Record<string, string> | null;
};

/** โหลดข้อมูลของวันนั้นจากฐานข้อมูลกลาง (ใช้ร่วมกันทุกเครื่อง/ทุกบัญชี) */
export const fetchSheet = async (d: Date): Promise<SheetValues> => {
  const { data, error } = await supabase
    .from("stock_entries")
    .select("sheet_date,row_id,cells")
    .eq("sheet_date", dateKey(d));

  if (error) throw error;

  const values: SheetValues = {};
  for (const row of (data ?? []) as EntryRow[]) {
    values[row.row_id] = (row.cells ?? {}) as SheetValues[string];
  }
  return values;
};

/** บันทึกทีละแถว (upsert) */
export const saveRow = async (d: Date, rowId: string, cells: SheetValues[string]) => {
  const { error } = await supabase
    .from("stock_entries")
    .upsert({ sheet_date: dateKey(d), row_id: rowId, cells: cells ?? {} }, { onConflict: "sheet_date,row_id" });
  if (error) throw error;
};

/** บันทึกหลายแถวพร้อมกัน เช่น ตอนโยกสต็อกไปวันถัดไป */
export const saveSheetRows = async (d: Date, values: SheetValues) => {
  const rows = Object.entries(values).map(([rowId, cells]) => ({
    sheet_date: dateKey(d),
    row_id: rowId,
    cells: cells ?? {},
  }));
  if (!rows.length) return;
  const { error } = await supabase
    .from("stock_entries")
    .upsert(rows, { onConflict: "sheet_date,row_id" });
  if (error) throw error;
};

/** ฟังการเปลี่ยนแปลงแบบเรียลไทม์ของวันที่กำลังเปิดอยู่ */
export const subscribeSheet = (
  d: Date,
  onChange: (rowId: string, cells: SheetValues[string]) => void,
) => {
  const key = dateKey(d);
  const channel = supabase
    .channel(`stock_entries:${key}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "stock_entries", filter: `sheet_date=eq.${key}` },
      (payload) => {
        const row = (payload.new ?? payload.old) as EntryRow | null;
        if (!row?.row_id) return;
        const cells = payload.eventType === "DELETE" ? {} : ((row.cells ?? {}) as SheetValues[string]);
        onChange(row.row_id, cells);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
