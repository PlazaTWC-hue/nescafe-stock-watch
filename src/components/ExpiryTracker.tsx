import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { sendLineAlert } from "@/lib/line-notify.functions";
import {
  EXPIRY_CATEGORIES,
  deleteExpiryItem,
  fetchExpiryItems,
  saveExpiryItem,
  sortExpiryItems,
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

const fmtDate = (iso: string) => {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};

const daysLeft = (iso: string) => {
  if (!iso) return 0;
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y!, (m ?? 1) - 1, d ?? 1).getTime();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - start) / 86400000);
};

const ALERT_OPTIONS = [7, 14, 30, 60, 90, 180];
const STORE_KEY = "expiry-alert-days";

export function ExpiryTracker() {
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(EXPIRY_CATEGORIES[0]);
  const [received, setReceived] = useState(todayKey());
  const [expiry, setExpiry] = useState("");
  /** แจ้งเตือน 2 ช่วง: เตือนแรก (สีเหลือง) และเตือนด่วน (สีแดง) */
  const [warnDays, setWarnDays] = useState(60);
  const [urgentDays, setUrgentDays] = useState(14);

  useEffect(() => {
    fetchExpiryItems()
      .then(setItems)
      .catch(() => toast.error("โหลดรายการวันหมดอายุไม่สำเร็จ"));

    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) {
        const p = JSON.parse(saved) as { warn?: number; urgent?: number };
        if (p.warn) setWarnDays(p.warn);
        if (p.urgent) setUrgentDays(p.urgent);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setAlert = (warn: number, urgent: number) => {
    setWarnDays(warn);
    setUrgentDays(urgent);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ warn, urgent }));
    } catch {
      /* ignore */
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, ExpiryItem[]>();
    for (const it of items) {
      const list = map.get(it.category) ?? [];
      list.push(it);
      map.set(it.category, list);
    }
    return [...map.entries()].sort(
      (a, b) =>
        (EXPIRY_CATEGORIES as readonly string[]).indexOf(a[0]) -
        (EXPIRY_CATEGORIES as readonly string[]).indexOf(b[0]),
    );
  }, [items]);

  const statusClass = (n: number) =>
    n < 0
      ? "bg-destructive/20 text-destructive"
      : n <= urgentDays
        ? "bg-destructive/15 text-destructive"
        : n <= warnDays
          ? "bg-amber-500/25 text-amber-700"
          : "bg-emerald-500/15 text-emerald-700";

  const add = async () => {
    if (!name.trim() || !expiry) {
      toast.error("กรอกชื่อสินค้าและวันหมดอายุ");
      return;
    }
    const order = items.filter((i) => i.category === category).length + 1;
    const item: ExpiryItem = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      category,
      order,
      received,
      expiry,
    };
    setItems((prev) => sortExpiryItems([...prev, item]));
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

  const alerts = items.filter((i) => daysLeft(i.expiry) <= warnDays);

  return (
    <div className="mt-3 print:hidden">
      <div className="rounded-lg border border-sheet-line bg-paper p-4 shadow-sheet">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-bold">รายการของในสต๊อก (เช็ควันหมดอายุ)</p>
            <p className="text-xs text-muted-foreground">
              แยกตามหมวด กล่อง / กระป๋อง / ถุง / กระบอก เรียงเหมือนใบสต๊อก
            </p>
          </div>
          <Button size="icon" className="size-10 shrink-0" onClick={() => setOpen((v) => !v)} aria-label="เพิ่มรายการ">
            <Plus className="size-5" />
          </Button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md bg-muted/40 px-3 py-2 text-xs">
          <span className="font-bold">แจ้งเตือนล่วงหน้า</span>
          <label className="flex items-center gap-1">
            เตือนแรก
            <select
              value={warnDays}
              onChange={(e) => setAlert(Number(e.target.value), urgentDays)}
              className="h-8 rounded-md border border-sheet-line bg-transparent px-2"
            >
              {ALERT_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} วัน
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            เตือนด่วน
            <select
              value={urgentDays}
              onChange={(e) => setAlert(warnDays, Number(e.target.value))}
              className="h-8 rounded-md border border-sheet-line bg-transparent px-2"
            >
              {ALERT_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} วัน
                </option>
              ))}
            </select>
          </label>
          <span className="ml-auto text-muted-foreground">
            ใกล้หมดอายุ <b className="text-sheet-ink">{alerts.length}</b> รายการ
          </span>
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
              หมวด
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 rounded-md border border-sheet-line bg-transparent px-2 text-sm"
              >
                {EXPIRY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-[11px] text-muted-foreground">
              วันที่รับเข้า
              <input
                type="date"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                className="h-10 rounded-md border border-sheet-line bg-transparent px-2 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col text-[11px] text-muted-foreground sm:col-span-2">
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
                {grouped.map(([cat, list]) => (
                  <Fragment key={cat}>
                    <tr className="bg-muted/50">
                      <td colSpan={5} className="py-1.5 text-xs font-bold">
                        {cat}
                      </td>
                    </tr>
                    {list.map((it) => {
                      const n = daysLeft(it.expiry);
                      return (
                        <tr key={it.id} className="border-b border-sheet-line/60">
                          <td className="py-2 font-medium">{it.name}</td>
                          <td className="py-2 tabular-nums">{fmtDate(it.received)}</td>
                          <td className="py-2 tabular-nums">{fmtDate(it.expiry)}</td>
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
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
