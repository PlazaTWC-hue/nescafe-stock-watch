import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, Calendar as CalendarIcon, Camera, Download, FileText, Minus, Plus, Printer, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
const CLOSING_REMINDER_URL =
  "/__l5e/assets-v1/99fef259-94e6-49d4-b73b-51fcc74a2781/closing-reminder-v2.png";
import {
  GROUPS,
  buildGroups,
  type ColKey,
  type LayoutEntry,
  type Row,
  type SheetValues,
  dateKey,
  displayCell,
  rolloverValues,
  thaiParts,
} from "@/lib/stock-sheet";
import { fetchLayout, fetchSheet, saveLayoutEntries, subscribeLayout, saveRow, saveSheetRows, subscribeSheet } from "@/lib/stock-remote";
import { ExpiryTracker } from "@/components/ExpiryTracker";
import { compressImage } from "@/lib/image-compress";
import { scanReceiptFn } from "@/lib/receipt-scan.functions";
import type { ScanKey } from "@/lib/receipt-scan-items";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const RAW_COLS: ColKey[] = ["oz16", "oz22", "oz32", "carry", "received", "used", "remain"];
const FRONT_COLS: ColKey[] = ["frontCarry", "frontIn", "sold", "frontRemain"];
const SHADED: ColKey[] = ["remain", "frontRemain"];
const COUNTERS: { id: string; label: string; img: string }[] = [
  { id: "nes-nescafe-red", label: "เนสกาแฟ ริช อโรมา แดง", img: "/images/nescafe-red.png" },
  { id: "nes-nescafe-green", label: "เนสกาแฟ เอสเปรสโซ โรสต์ เขียว", img: "/images/nescafe-green.png" },
];




/** รายการที่อนุญาตให้เติมยอดขายจากการถ่ายใบสรุปยอด */
const SCAN_TO_ROW: Record<ScanKey, string> = {
  promotion: "tnt-promotion",
  canCoke: "can-coke",
  canCokeZero: "can-coke-zero",
  canRed: "can-red",
  canGreen: "can-green",
  canOrange: "can-orange",
  canSprite: "can-sprite",
  canSchweppes: "can-schweppes",
  canGrape: "can-grape",
  canMinutemaid: "can-minutemaid",
  water: "eq-water",
  
  cup16: "eq-cup-16",
  cup22: "eq-cup-22",
  cup32: "eq-cup-32",
  ice16: "nes-ice-16",
};



export function StockSheet() {
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [values, setValues] = useState<SheetValues>({});
  const [waterAdd, setWaterAdd] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const pendingRows = useRef<Set<string>>(new Set());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valuesRef = useRef<SheetValues>({});

  valuesRef.current = values;

  // รายการสินค้าที่เพิ่ม/ลบเอง (ใช้ร่วมกันทุกเครื่อง)
  const [layout, setLayout] = useState<LayoutEntry[]>([]);
  const pendingLayout = useRef(new Map<string, LayoutEntry>());
  const layoutQueue = useRef<Promise<void>>(Promise.resolve());
  const layoutRevision = useRef(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const revision = layoutRevision.current;
      try {
        const remote = await fetchLayout();
        if (!alive || revision !== layoutRevision.current) return;
        setLayout([...remote.filter(e => !pendingLayout.current.has(e.id)), ...pendingLayout.current.values()]);
      } catch { if (alive) toast.error("โหลดรายการสินค้าไม่สำเร็จ"); }
    };
    void load();
    const unsub = subscribeLayout((e) => {
      if (pendingLayout.current.has(e.id)) return;
      layoutRevision.current++;
      setLayout((prev) => [...prev.filter((l) => l.id !== e.id), e]);
    });
    // สำรอง: รีเฟรชทุก 15 วินาที และเมื่อกลับมาที่หน้าเว็บ
    const t = window.setInterval(load, 15000);
    const onVis = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      unsub();
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  const groups = useMemo(() => buildGroups(layout), [layout]);

  const updateLayouts = (entries: LayoutEntry[]) => {
    layoutRevision.current++;
    entries.forEach(e => pendingLayout.current.set(e.id, e));
    setLayout(prev => [...prev.filter(l => !entries.some(e => e.id === l.id)), ...entries]);
    const task = layoutQueue.current.then(async () => {
      try {
        await saveLayoutEntries(entries);
        return true;
      } catch {
        toast.error("บันทึกรายการสินค้าไม่สำเร็จ กรุณาลองใหม่");
        return false;
      } finally {
        entries.forEach(e => { if (pendingLayout.current.get(e.id) === e) pendingLayout.current.delete(e.id); });
        layoutRevision.current++;
      }
    });
    layoutQueue.current = task.then(() => undefined);
    return task;
  };
  const updateLayout = (e: LayoutEntry) => updateLayouts([e]);

  const addItem = (gi: number) => {
    const n = window.prompt(`เพิ่มรายการในหมวด "${GROUPS[gi]?.supplier ?? ""}"\nชื่อสินค้า:`)?.trim();
    if (!n) return;
    const u = window.prompt("หน่วย (เช่น ขวด, กล่อง, ใบ):", "ชิ้น")?.trim() || "ชิ้น";
    void updateLayout({
      id: `c${Date.now().toString(36)}`,
      g: String(gi),
      n: n.slice(0, 32),
      u: u.slice(0, 32),
    });
    toast.success(`เพิ่ม "${n}" แล้ว`);
  };

  const [editing, setEditing] = useState(false);
  const moveItem = (gi: number, i: number, dir: -1 | 1) => {
    const ids = (groups[gi]?.rows ?? []).map((r) => r.id);
    const j = i + dir;
    const a = ids[i];
    const b = ids[j];
    if (a === undefined || b === undefined) return;
    ids[i] = b;
    ids[j] = a;
    void updateLayout({ id: `order-${gi}`, o: ids.join(",") });
  };

  // กดค้างเพื่อเลือกรายการ แล้วแตะอีกรายการเพื่อสลับตำแหน่ง
  const [picked, setPicked] = useState<{ gi: number; i: number } | null>(null);
  const holdTimer = useRef<number | null>(null);
  const startHold = (gi: number, i: number) => {
    if (!editing) return;
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      setPicked({ gi, i });
      navigator.vibrate?.(30);
      toast("เลือกแล้ว — แตะรายการที่ต้องการสลับตำแหน่ง");
    }, 500);
  };
  const cancelHold = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  const tapRow = (gi: number, i: number) => {
    if (!editing || !picked) return;
    if (picked.gi === gi && picked.i === i) return;
    if (picked.gi !== gi) {
      toast.error("สลับได้เฉพาะรายการในหมวดเดียวกัน");
      setPicked(null);
      return;
    }
    const ids = (groups[gi]?.rows ?? []).map((r) => r.id);
    const a = ids[picked.i];
    const b = ids[i];
    if (a && b) {
      ids[picked.i] = b;
      ids[i] = a;
      void updateLayout({ id: `order-${gi}`, o: ids.join(",") });
    }
    setPicked(null);
  };

  // Repair the earlier placement only after the complete order is saved successfully.
  const fixingChang = useRef(false);
  useEffect(() => {
    if (!layout.length || fixingChang.current || layout.some((l) => l.id === "fix-chang-v2")) return;
    const chang = layout.find((l) => l.n?.includes("น้ำแร่ช้าง") && l.x !== "1");
    if (!chang) return;
    const gi = GROUPS.findIndex((g) => g.rows.some((r) => r.id === "eq-water"));
    if (gi < 0) return;
    const fixed = { ...chang, g: String(gi) };
    const next = [...layout.filter((l) => l.id !== chang.id), fixed];
    const ids = (buildGroups(next)[gi]?.rows ?? []).map((r) => r.id).filter((id) => id !== chang.id);
    ids.splice(ids.indexOf("eq-water") + 1, 0, chang.id);
    fixingChang.current = true;
    void updateLayouts([fixed, { id: `order-${gi}`, o: ids.join(",") }, { id: "fix-chang-v2", o: "1" }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const removeItem = (row: Row) => {
    if (!window.confirm(`ลบรายการ "${row.name}" ออกจากตาราง?`)) return;
    const own = layout.find((l) => l.id === row.id);
    void updateLayout({ ...(own ?? { id: row.id }), x: "1" });
  };

  // โหลดข้อมูลจากฐานข้อมูลกลาง + ฟังการอัปเดตแบบเรียลไทม์
  useEffect(() => {
    let alive = true;
    setSyncing(true);
    fetchSheet(date)
      .then((remote) => {
        if (!alive) return;
        setValues(remote);
      })
      .catch(() => {
        if (alive) toast.error("โหลดข้อมูลจากเซิร์ฟเวอร์ไม่สำเร็จ");
      })
      .finally(() => {
        if (alive) setSyncing(false);
      });

    const unsubscribe = subscribeSheet(date, (rowId, cells) => {
      if (pendingRows.current.has(rowId)) return; // กำลังพิมพ์แถวนี้อยู่ อย่าเขียนทับ
      setValues((prev) => ({ ...prev, [rowId]: cells }));
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [date]);

  const flush = useCallback(
    async (d: Date) => {
      const rowIds = [...pendingRows.current];
      if (!rowIds.length) return;
      pendingRows.current.clear();
      try {
        await Promise.all(rowIds.map((id) => saveRow(d, id, valuesRef.current[id] ?? {})));
      } catch {
        toast.error("บันทึกขึ้นเซิร์ฟเวอร์ไม่สำเร็จ");
      }
    },
    [],
  );

  const setCell = (rowId: string, col: ColKey, raw: string) => {
    const v = raw.replace(/[^\d.-]/g, "");
    setValues((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [col]: v } }));
    pendingRows.current.add(rowId);
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => void flush(date), 500);
  };

  /** บวก/ลบค่าในช่อง (คำนวณจากค่าล่าสุดเสมอ กันกดรัวแล้วเลขไม่ตาม) */
  const bumpCells = (targets: { rowId: string; col: ColKey }[], delta: number) => {
    setValues((prev) => {
      const next = { ...prev };
      for (const t of targets) {
        const cur = Number(next[t.rowId]?.[t.col] ?? "") || 0;
        next[t.rowId] = { ...next[t.rowId], [t.col]: String(Math.max(0, cur + delta)) };
      }
      return next;
    });
    targets.forEach((t) => pendingRows.current.add(t.rowId));
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => void flush(date), 500);
  };


  // ถ่ายรูปใบสรุปยอด -> เติมยอดขายเฉพาะรายการที่กำหนด
  const handleReceipt = async (file: File) => {
    setScanning(true);
    const tid = toast.loading("กำลังอ่านใบสรุปยอด...");
    try {
      const image = await compressImage(file);
      const result = await scanReceiptFn({ data: { image } });
      const sold: Record<string, number> = {};
      for (const [key, qty] of Object.entries(result)) {
        if (key === "ice16") continue; // น้ำแข็งเปล่าลงช่อง 16 OZ. ไม่ใช่ยอดขาย
        const rowId = SCAN_TO_ROW[key as ScanKey];
        if (!rowId || !qty) continue;
        sold[rowId] = (sold[rowId] ?? 0) + qty;
      }
      // น้ำแข็งเปล่า 16 ออนซ์ ต้องบวกเข้าไปในยอดขายแก้ว 16 ออนซ์ด้วย
      const ice = result.ice16 ?? 0;
      if (ice) sold["eq-cup-16"] = (sold["eq-cup-16"] ?? 0) + ice;


      const rowIds = Object.keys(sold);
      if (!rowIds.length && !ice) {
        toast.error("อ่านตัวเลขจากรูปไม่ได้ ลองถ่ายให้ชัดขึ้นครับ", { id: tid });
        return;
      }
      setValues((prev) => {
        const next = { ...prev };
        for (const id of rowIds) next[id] = { ...prev[id], sold: String(sold[id]) };
        if (ice) next["nes-ice-16"] = { ...next["nes-ice-16"], oz16: String(ice) };
        return next;
      });
      rowIds.forEach((id) => pendingRows.current.add(id));
      if (ice) pendingRows.current.add("nes-ice-16");

      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => void flush(date), 300);
      toast.success(`เติมยอดขายจากใบสรุปแล้ว ${rowIds.length} รายการ`, { id: tid });
    } catch (error) {
      const msg = error instanceof Error && error.message ? error.message : "";
      toast.error(msg && msg.length < 120 ? msg : "อ่านใบสรุปยอดไม่สำเร็จ ลองอีกครั้งครับ", {
        id: tid,
      });
    } finally {
      setScanning(false);
    }
  };


  const parts = thaiParts(date);


  const handleRollover = async () => {
    await flush(date);
    // แก้ว 9 ออนซ์ใช้ยอดขายกาแฟที่คำนวณอัตโนมัติ จึงต้องใส่ค่านี้ก่อนโยกยอด
    // ไม่เช่นนั้นระบบจะโยกจากข้อมูลดิบที่ไม่มียอดขายและคงค่าเดิมข้ามวัน
    const rolloverSource: SheetValues = {
      ...values,
      "eq-cup-9": { ...values["eq-cup-9"], sold: cupNineSold() },
    };
    const next = rolloverValues(rolloverSource, groups.flatMap((g) => g.rows));
    const nextDate = startOfDay(new Date(date.getTime() + 86_400_000));
    try {
      const existing = await fetchSheet(nextDate);
      const merged: SheetValues = { ...next };
      for (const [rowId, cells] of Object.entries(existing)) {
        merged[rowId] = { ...next[rowId], ...cells };
      }
      await saveSheetRows(nextDate, merged);
      setDate(nextDate);
      setReminderOpen(true);
      toast.success("โยกสต็อกไปวันถัดไปแล้ว");
    } catch {
      toast.error("โยกสต็อกไม่สำเร็จ");
    }
  };


  const exportImage = async () => {
    const el = sheetRef.current;
    if (!el) return null;
    const { default: html2canvas } = await import("html2canvas-pro");
    return html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
  };

  const handlePng = async () => {
    setExporting(true);
    try {
      const canvas = await exportImage();
      if (!canvas) return;
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `stock-${dateKey(date)}.png`;
      a.click();
      toast.success("บันทึกไฟล์ PNG แล้ว");
    } catch {
      toast.error("บันทึก PNG ไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  };

  const handlePdf = async () => {
    setExporting(true);
    try {
      const canvas = await exportImage();
      if (!canvas) return;
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pw / canvas.width, ph / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", (pw - w) / 2, 12, w, h - 24);
      pdf.save(`stock-${dateKey(date)}.pdf`);
      toast.success("บันทึกไฟล์ PDF แล้ว");
    } catch {
      toast.error("บันทึก PDF ไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    setExporting(true);
    try {
      const canvas = await exportImage();
      if (!canvas) return;
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("no blob");
      const file = new File([blob], `stock-${dateKey(date)}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `แบบบันทึก STOCK วัตถุดิบ ${parts.day} ${parts.month} ${parts.year}`,
        });
      } else {
        await handlePng();
      }
    } catch {
      /* ผู้ใช้ยกเลิกการแชร์ */
    } finally {
      setExporting(false);
    }
  };

  // ยอดขายแก้ว 9 ออนซ์ = ยอดขายกาแฟซองแดง + เขียว
  const cupNineSold = () => {
    const red = values["nes-nescafe-red"]?.sold ?? "";
    const green = values["nes-nescafe-green"]?.sold ?? "";
    if (!red.trim() && !green.trim()) return "";
    return String((Number(red) || 0) + (Number(green) || 0));
  };

  const cell = (row: Row, col: ColKey) => {
    const derived = row.id === "eq-cup-9" && col === "sold";
    // แก้ว 9 ออนซ์: คงเหลือหน้าร้านต้องหักยอดขายที่คำนวณจากกาแฟด้วย
    const nineFrontRemain = row.id === "eq-cup-9" && col === "frontRemain";
    let value: string;
    if (derived) {
      value = cupNineSold();
    } else if (nineFrontRemain) {
      const cells = { ...(values[row.id] ?? {}), sold: cupNineSold() };
      value = displayCell(row, cells, col);
    } else {
      value = displayCell(row, values[row.id], col);
    }
    return (
      <td key={col} className={`sheet-td p-0 ${SHADED.includes(col) ? "bg-sheet-shade" : ""}`}>
        <input
          inputMode="decimal"
          readOnly={derived}
          value={value}
          onChange={(e) => {
            if (!derived) setCell(row.id, col, e.target.value);
          }}
          className={`sheet-input ${SHADED.includes(col) ? "font-semibold" : ""}`}
        />
      </td>
    );
  };



  return (
    <div className="mx-auto max-w-[1180px] px-3 py-6 sm:px-6 print:max-w-none print:p-0">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Button variant={editing ? "default" : "outline"} onClick={() => setEditing((v) => !v)}>
          {editing ? "เสร็จสิ้น" : "แก้ไขรายการ"}
        </Button>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="size-4" />
              {`${parts.day} ${parts.month} ${parts.year}`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (!d) return;
                setDate(startOfDay(d));
                setPickerOpen(false);
              }}
              defaultMonth={date}
            />
          </PopoverContent>
        </Popover>

        {syncing && <span className="text-xs text-muted-foreground">กำลังซิงค์ข้อมูล…</span>}

        <Button onClick={handleRollover} disabled={exporting || syncing}>
          <ArrowRightLeft className="size-4" /> โยกสต็อกและเปลี่ยนวัน
        </Button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void handleReceipt(f);
          }}
        />
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={scanning}>
          <Camera className="size-4" /> {scanning ? "กำลังอ่านใบสรุป…" : "ถ่ายใบสรุปยอด"}
        </Button>


        <div className="ms-auto flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleShare} disabled={exporting}>
            <Share2 className="size-4" /> แชร์
          </Button>
          <Button variant="secondary" onClick={() => window.print()} disabled={exporting}>
            <Printer className="size-4" /> ปริ้น
          </Button>
          <Button variant="secondary" onClick={handlePng} disabled={exporting}>
            <Download className="size-4" /> PNG
          </Button>
          <Button variant="secondary" onClick={handlePdf} disabled={exporting}>
            <FileText className="size-4" /> PDF
          </Button>
        </div>
      </div>

      <p className="mb-3 text-xs text-muted-foreground print:hidden">
        กรอกตัวเลขได้ทุกช่อง ระบบคำนวณสต็อกคงเหลือให้อัตโนมัติหลังกรอกยอดเบิกใช้ และนำยอดเบิกใช้ไปใส่
        “สินค้าเข้าหน้าร้าน” ให้เอง กด “โยกสต็อกและเปลี่ยนวัน” เพื่อยกยอดคงเหลือไปเป็นสต็อกยกมาของวันถัดไป
      </p>

      <div className="overflow-x-auto rounded-lg border border-sheet-line bg-paper shadow-sheet print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
        <div ref={sheetRef} className="print-sheet min-w-[1040px] bg-paper p-5 print:p-0">
          <div className="flex items-start gap-4">
            <img src="/images/logo.png" alt="Big C สระบุรี" className="h-20 w-auto object-contain" />
            <header className="flex-1 text-center leading-relaxed">
              <h1 className="text-lg font-semibold tracking-wide">แบบบันทึก STOCK วัตถุดิบ</h1>
              <p className="text-base">ฝ่ายพลาซ่า สาขา สระบุรี</p>
              <p className="text-base">
                ประจำวันที่ <span className="mx-1 font-semibold underline">{parts.day}</span>
                เดือน <span className="mx-1 font-semibold underline">{parts.month}</span>
                ปี <span className="mx-1 font-semibold underline">{parts.year}</span>
              </p>
            </header>
            <div className="h-20 w-20 shrink-0" aria-hidden />
          </div>

          <table className="mt-4 w-full border-collapse text-center text-[14px]">
            <thead>
              <tr>
                <th rowSpan={2} className="sheet-th w-[112px]">
                  Supplier
                </th>
                <th rowSpan={2} className="sheet-th w-[170px]">
                  รายการสินค้า
                </th>
                <th rowSpan={2} className="sheet-th w-[64px]">
                  หน่วยนับ
                </th>
                <th colSpan={3} className="sheet-th">
                  วัตถุดิบ
                </th>
                <th colSpan={8} className="sheet-th">
                  รวมจำนวนสินค้า
                </th>
              </tr>
              <tr>
                <th className="sheet-th">16 OZ.</th>
                <th className="sheet-th">22 OZ.</th>
                <th className="sheet-th">32 OZ.</th>
                <th className="sheet-th">สต็อคยกมา</th>
                <th className="sheet-th">รับเข้า</th>
                <th className="sheet-th">เบิกใช้</th>
                <th className="sheet-th bg-sheet-shade">สต็อคคงเหลือ</th>
                <th className="sheet-th">สต็อคยกมาหน้าร้าน</th>
                <th className="sheet-th">สินค้าเข้าหน้าร้าน</th>
                <th className="sheet-th">ยอดขาย</th>
                <th className="sheet-th bg-sheet-shade">สต็อคคงเหลือหน้าร้าน</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, gi) => {
                return (
                  <Fragment key={group.supplier}>
                    {group.rows.length === 0 && (
                      <tr>
                        <td className="sheet-td text-start font-medium">
                          {group.supplier}
                          {editing && !exporting && (
                            <button type="button" onClick={() => addItem(gi)} className="ml-1 text-primary print:hidden" aria-label="เพิ่มรายการ">
                              <Plus className="inline size-3.5" />
                            </button>
                          )}
                        </td>
                        <td className="sheet-td" colSpan={13} />
                      </tr>
                    )}
                    {group.rows.map((row, i) => (
                      <tr key={row.id}>
                        {i === 0 && (
                          <td
                            rowSpan={group.rows.length}
                            className="sheet-td align-top text-start font-medium"
                          >
                            {group.supplier}
                            {editing && !exporting && (
                              <button type="button" onClick={() => addItem(gi)} className="ml-1 text-primary print:hidden" aria-label="เพิ่มรายการ">
                                <Plus className="inline size-3.5" />
                              </button>
                            )}
                          </td>
                        )}
                        <td
                          colSpan={row.spanUnit ? 2 : 1}
                          className={`sheet-td text-start ${row.italic ? "italic" : ""} ${editing ? "cursor-pointer select-none" : ""} ${picked?.gi === gi && picked.i === i ? "bg-primary/20 ring-2 ring-primary" : ""}`}
                          onPointerDown={() => startHold(gi, i)}
                          onPointerUp={cancelHold}
                          onPointerLeave={cancelHold}
                          onContextMenu={(e) => editing && e.preventDefault()}
                          onClick={() => tapRow(gi, i)}
                        >
                          {row.names ? (
                            <div className="flex flex-col gap-0.5">
                              {row.names.map((n) => (
                                <span key={n}>{n}</span>
                              ))}
                            </div>
                          ) : (
                            row.name
                          )}
                          {editing && !exporting && (
                            <span className="ml-1 inline-flex items-center gap-0.5 print:hidden">
                              <button type="button" disabled={i === 0} onClick={() => moveItem(gi, i, -1)} className="rounded border px-1 text-xs disabled:opacity-30" aria-label="เลื่อนขึ้น">▲</button>
                              <button type="button" disabled={i === group.rows.length - 1} onClick={() => moveItem(gi, i, 1)} className="rounded border px-1 text-xs disabled:opacity-30" aria-label="เลื่อนลง">▼</button>
                              <button type="button" onClick={() => removeItem(row)} className="text-destructive" aria-label="ลบรายการ">
                                <X className="inline size-3" />
                              </button>
                            </span>
                          )}
                        </td>
                        {!row.spanUnit && (
                          <td className="sheet-td text-muted-foreground">{row.unit}</td>
                        )}
                        {RAW_COLS.map((col) => cell(row, col))}
                        {FRONT_COLS.map((col) => cell(row, col))}
                      </tr>
                    ))}
                    {group.showTotal && (
                      <tr className="bg-sheet-shade font-semibold">
                        <td className="sheet-td" colSpan={2}>
                          รวม
                        </td>
                        <td className="sheet-td" colSpan={11} />
                      </tr>
                    )}
                    {group.showGrandTotal && (
                      <tr className="bg-sheet-shade font-bold">
                        <td className="sheet-td" colSpan={2}>
                          ยอดรวมสุทธิ
                        </td>
                        <td className="sheet-td" colSpan={11} />
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-3">
            {["ผู้รายงาน", "ผู้ตรวจสอบ (ฝ่ายพลาซ่า)", "ผู้ตรวจสอบ (ฝ่ายบัญชี)"].map((label) => (
              <div key={label} className="border border-sheet-line px-2 py-3">
                <span>{label}</span>
                <div className="mt-4 border-t border-dashed border-sheet-line" />
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 print:hidden">
        {COUNTERS.map((c) => {
          const current = Number(values[c.id]?.sold ?? "") || 0;
          const step = (delta: number) => bumpCells([{ rowId: c.id, col: "sold" }], delta);

          return (
            <div
              key={c.id}
              className="rounded-lg border border-sheet-line bg-paper p-5 text-center shadow-sheet"
            >
              <img
                src={c.img}
                alt={c.label}
                className="mx-auto mb-3 h-40 w-40 object-contain"
                loading="lazy"
              />
              <p className="mb-3 text-lg font-bold">{c.label}</p>

              <div className="flex items-center justify-center gap-5">
                <Button variant="outline" size="icon" className="size-12" onClick={() => step(-1)} aria-label="ลด">
                  <Minus className="size-6" />
                </Button>
                <span className="min-w-20 text-4xl font-extrabold tabular-nums text-sheet-ink">{current}</span>
                <Button variant="outline" size="icon" className="size-12" onClick={() => step(1)} aria-label="เพิ่ม">
                  <Plus className="size-6" />
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">เด้งไปช่องยอดขายอัตโนมัติ</p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 print:hidden">
        <div className="rounded-lg border border-sheet-line bg-paper p-4 shadow-sheet">
          <p className="mb-1 text-base font-bold">เบิกน้ำทิพย์ (ทยอยเบิก)</p>
          <p className="mb-3 text-xs text-muted-foreground">
            ใส่จำนวนที่เบิกเพิ่ม แล้วกดยืนยัน ระบบจะบวกเข้าช่อง “เบิกใช้” และหักสต๊อกหลังร้านให้อัตโนมัติ
          </p>
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              value={waterAdd}
              onChange={(e) => setWaterAdd(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="จำนวนขวด"
              className="h-11 w-32 rounded-md border border-sheet-line bg-transparent px-3 text-lg font-bold tabular-nums outline-none"
            />
            <Button
              className="h-11"
              onClick={() => {
                const n = Number(waterAdd) || 0;
                if (!n) return;
                bumpCells([{ rowId: "eq-water", col: "used" }], n);
                setWaterAdd("");
                toast.success(`เบิกน้ำทิพย์เพิ่ม ${n} ขวด`);
              }}
            >
              ยืนยัน
            </Button>
            <span className="ml-auto text-sm text-muted-foreground">
              เบิกใช้วันนี้รวม{" "}
              <b className="text-2xl tabular-nums text-sheet-ink">
                {Number(values["eq-water"]?.used ?? "") || 0}
              </b>{" "}
              ขวด
            </span>
          </div>
        </div>
      </div>


      <ExpiryTracker />

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="max-w-md overflow-hidden p-0 sm:max-w-lg">
          <img
            src={CLOSING_REMINDER_URL}
            alt=""
            className="block h-auto w-full rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

