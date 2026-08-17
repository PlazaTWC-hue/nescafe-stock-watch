import { supabase } from "@/integrations/supabase/client";

/**
 * รายการของหมดอายุเก็บในตาราง stock_entries โดยใช้ "วันที่พิเศษ" เป็นกล่องเก็บรวม
 * (row_id ขึ้นต้นด้วย exp- ซึ่งไม่ตรงกับแถวใดในใบสต๊อก จึงไม่ไปโผล่ในตารางรายวัน)
 */
const EXPIRY_BUCKET = "2026-12-31";

export const EXPIRY_CATEGORIES = ["กล่อง", "กระป๋อง", "ถุง", "กระบอก", "อื่นๆ"] as const;
export type ExpiryCategory = (typeof EXPIRY_CATEGORIES)[number];

export type ExpiryItem = {
  id: string;
  name: string;
  category: string;
  order: number;
  received: string; // YYYY-MM-DD (ว่างได้)
  expiry: string; // YYYY-MM-DD
};

type RawRow = { row_id: string; cells: Record<string, string> | null };

const catIndex = (c: string) => {
  const i = (EXPIRY_CATEGORIES as readonly string[]).indexOf(c);
  return i < 0 ? EXPIRY_CATEGORIES.length : i;
};

export const sortExpiryItems = (items: ExpiryItem[]) =>
  [...items].sort(
    (a, b) =>
      catIndex(a.category) - catIndex(b.category) ||
      a.order - b.order ||
      a.expiry.localeCompare(b.expiry),
  );

export const fetchExpiryItems = async (): Promise<ExpiryItem[]> => {
  const { data, error } = await supabase
    .from("stock_entries")
    .select("row_id,cells")
    .eq("sheet_date", EXPIRY_BUCKET);
  if (error) throw error;

  const items = ((data ?? []) as RawRow[])
    .filter((r) => r.row_id.startsWith("exp-") && (r.cells?.["name"] ?? "") !== "")
    .map((r) => ({
      id: r.row_id,
      name: r.cells?.["name"] ?? "",
      category: r.cells?.["cat"] ?? "อื่นๆ",
      order: Number(r.cells?.["ord"] ?? "0") || 0,
      received: r.cells?.["rcv"] ?? "",
      expiry: r.cells?.["exp"] ?? "",
    }));

  return sortExpiryItems(items);
};

export const saveExpiryItem = async (item: ExpiryItem) => {
  const cells: Record<string, string> = {
    name: item.name,
    cat: item.category,
    ord: String(item.order),
    exp: item.expiry,
  };
  if (item.received) cells["rcv"] = item.received;

  const { error } = await supabase
    .from("stock_entries")
    .upsert({ sheet_date: EXPIRY_BUCKET, row_id: item.id, cells }, { onConflict: "sheet_date,row_id" });
  if (error) throw error;
};

/** ลบแบบซ่อน (ฐานข้อมูลไม่อนุญาตให้ลบแถวจริง) */
export const deleteExpiryItem = async (id: string) => {
  const { error } = await supabase
    .from("stock_entries")
    .update({ cells: {} })
    .eq("sheet_date", EXPIRY_BUCKET)
    .eq("row_id", id);
  if (error) throw error;
};
