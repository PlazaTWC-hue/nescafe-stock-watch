import { supabase } from "@/integrations/supabase/client";

import { dateKey, type LayoutEntry, type SheetValues } from "./stock-sheet";
import { decodeLayout, encodeLayout } from "./stock-layout";

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

/** การตั้งค่ารายการสินค้า เก็บในวันที่คงที่ (แถว cfg-*) */
const LAYOUT_DATE = "2026-10-01";

export const fetchLayout = async (): Promise<LayoutEntry[]> => {
  const { data, error } = await supabase
    .from("stock_entries")
    .select("row_id,cells")
    .eq("sheet_date", LAYOUT_DATE);
  if (error) throw error;
  return ((data ?? []) as { row_id: string; cells: Record<string, string> | null }[])
    .filter((r) => r.row_id.startsWith("cfg-"))
    .map((r) => decodeLayout(r.row_id.slice(4), r.cells ?? {}));
};

export const saveLayoutEntry = async (e: LayoutEntry) => {
  return saveLayoutEntries([e]);
};

export const saveLayoutEntries = async (entries: LayoutEntry[]) => {
  const { error } = await supabase
    .from("stock_entries")
    .upsert(entries.map(e => ({ sheet_date: LAYOUT_DATE, row_id: `cfg-${e.id}`, cells: encodeLayout(e) })), { onConflict: "sheet_date,row_id" });
  if (error) throw error;
};

/** ฟังการเปลี่ยนแปลงรายการสินค้า/ลำดับ แบบเรียลไทม์ (ทุกเครื่องเห็นตรงกัน) */
export const subscribeLayout = (onChange: (e: LayoutEntry) => void) => {
  const channel = supabase
    .channel(`stock_layout:${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "stock_entries", filter: `sheet_date=eq.${LAYOUT_DATE}` },
      (payload) => {
        const row = payload.new as { row_id?: string; cells?: Record<string, string> } | null;
        if (!row?.row_id?.startsWith("cfg-")) return;
        onChange(decodeLayout(row.row_id.slice(4), row.cells ?? {}));
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};
