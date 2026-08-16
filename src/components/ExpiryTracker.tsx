import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  deleteExpiryItem,
  fetchExpiryItems,
  saveExpiryItem,
  type ExpiryItem,
} from "@/lib/expiry-remote";

const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const thaiDate = (iso: string) => {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
};

const daysLeft = (iso: string) => {
  if (!iso) return 0;
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y!, (m ?? 1) - 1, d ?? 1).getTime();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - start) / 86400000);
};

const statusClass = (n: number) =>
  n < 0
    ? "bg-destructive/15 text-destructive"
    : n <= 30
      ? "bg-amber-500/20 text-amber-700"
      : "bg-emerald-500/15 text-emerald-700";

export function ExpiryTracker() {
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [received, setReceived] = useState(todayKey());
  const [expiry, setExpiry] = useState("");

  useEffect(() => {
    fetchExpiryItems()
      .then(setItems)
      .catch(() => toast.error("โหลดรายการวันหมดอายุไม่สำเร็จ"));
  }, []);

  const add = async () => {
    if (!name.trim() || !expiry) {
      toast.error("กรอกชื่อสินค้าและวันหมดอายุ");
      return;
    }
    const item: ExpiryItem = {
      id: `expiry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      received: received || todayKey(),
      expiry,
    };
    setItems((prev) => [...prev, item].sort((a, b) => a.expiry.localeCompare(b.expiry)));
    setName("");
    setExpiry("");
    setOpen(false);
    try {
      await saveExpiryItem(item);
      toast.success("บันทึกรายการแล้ว");
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await deleteExpiryItem(id);
    } catch {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  return (
    <div className="mt-3 print:hidden">
      <div className="rounded-lg border border-sheet-line bg-paper p-4 shadow-sheet">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-base font-bold">รายการของในสต๊อก (เช็ควันหมดอายุ)</p>
            <p className="text-xs text-muted-foreground">
              น้ำอัดลมกระป๋อง ไซรัป ฯลฯ — บอกวันรับเข้า วันหมดอายุ และเหลืออีกกี่วัน
            </p>
          </div>
          <Button size="icon" className="size-10 shrink-0" onClick={() => setOpen((v) => !v)} aria-label="เพิ่มรายการ">
            <Plus className="size-5" />
          </Button>
        </div>

        {open && (
          <div className="mb-3 grid gap-2 rounded-md border border-dashed border-sheet-line p-3 sm:grid-cols-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อสินค้า"
              className="h-10 rounded-md border border-sheet-line bg-transparent px-3 text-sm outline-none sm:col-span-2"
            />
            <label className="flex flex-col text-[11px] text-muted-foreground">
              วันที่รับเข้า
              <input
                type="date"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                className="h-10 rounded-md border border-sheet-line bg-transparent px-2 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col text-[11px] text-muted-foreground">
              วันหมดอายุ
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="h-10 rounded-md border border-sheet-line bg-transparent px-2 text-sm outline-none"
              />
            </label>
            <div className="sm:col-span-4">
              <Button className="h-10 w-full sm:w-40" onClick={add}>
                บันทึกรายการ
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">ยังไม่มีรายการ กด + เพื่อเพิ่ม</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sheet-line text-left text-xs text-muted-foreground">
                  <th className="py-2">รายการ</th>
                  <th className="py-2">รับเข้า</th>
                  <th className="py-2">หมดอายุ</th>
                  <th className="py-2">เหลือ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const n = daysLeft(it.expiry);
                  return (
                    <tr key={it.id} className="border-b border-sheet-line/60">
                      <td className="py-2 font-medium">{it.name}</td>
                      <td className="py-2 tabular-nums">{thaiDate(it.received)}</td>
                      <td className="py-2 tabular-nums">{thaiDate(it.expiry)}</td>
                      <td className="py-2">
                        <span className={`rounded px-2 py-1 text-xs font-bold tabular-nums ${statusClass(n)}`}>
                          {n < 0 ? `หมดอายุแล้ว ${Math.abs(n)} วัน` : `${n} วัน`}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => remove(it.id)}
                          aria-label="ลบ"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
