export type ColKey =
  | "oz16"
  | "oz22"
  | "oz32"
  | "carry"
  | "received"
  | "used"
  | "remain"
  | "frontCarry"
  | "frontIn"
  | "sold"
  | "frontRemain";

export type Row = {
  id: string;
  name: string;
  /** หลายรายการรวมในช่องเดียว (ช่องกรอกเลขใช้ร่วมกัน) */
  names?: string[];
  unit: string;
  italic?: boolean;
  spanUnit?: boolean;
  /** ล็อคช่องคงเหลือ (สต็อค/หน้าร้าน) ให้เป็น 0 เสมอ เช่น แถว Promotion */
  lockZeroRemain?: boolean;
  /** ล็อคเฉพาะช่องคงเหลือหน้าร้านให้เป็น 0 เสมอ (แต่สต็อคคงเหลือคิดตามจริง) */
  lockZeroFrontRemain?: boolean;
  /** นับยอดหน้าร้านตามจริง (ไม่ล็อคเป็น 0) แม้หน่วยจะเป็นใบ/ถุง ฯลฯ */
  countFront?: boolean;
};

export type Group = {
  supplier: string;
  rows: Row[];
  showTotal?: boolean;
  showGrandTotal?: boolean;
};

export const GROUPS: Group[] = [
  {
    supplier: "บ.ไทยน้ำทิพย์",
    showTotal: true,
    rows: [
      { id: "tnt-coke", name: "โค้ก", unit: "กล่อง" },
      { id: "tnt-coke-zero", name: "โค้กซีโร่", unit: "กล่อง" },
      { id: "tnt-fanta-red", name: "แฟนต้าแดง", unit: "กล่อง" },
      { id: "tnt-fanta-orange", name: "แฟนต้าส้ม", unit: "กล่อง" },
      { id: "tnt-fanta-grape", name: "แฟนต้าองุ่น", unit: "กล่อง" },
      { id: "tnt-sprite", name: "สไปรท์", unit: "กล่อง" },
      { id: "tnt-co2", name: "ก๊าซ CO2", unit: "ถัง", lockZeroFrontRemain: true },
      { id: "tnt-promotion", name: "Promotion", unit: "แก้ว", italic: true, lockZeroRemain: true },
    ],
  },
  {
    supplier: "กระป๋อง/ขวด",
    showTotal: true,
    rows: [
      { id: "can-coke", name: "โค้ก", unit: "กระป๋อง" },
      { id: "can-coke-zero", name: "โค้กซีโร่", unit: "กระป๋อง" },
      { id: "can-red", name: "แดง", unit: "กระป๋อง" },
      { id: "can-green", name: "เขียว", unit: "กระป๋อง" },
      { id: "can-orange", name: "ส้ม", unit: "กระป๋อง" },
      { id: "can-sprite", name: "สไปรท์", unit: "กระป๋อง" },
      { id: "can-schweppes", name: "ชเวปส์", unit: "ขวด" },
      { id: "can-grape", name: "องุ่น", unit: "กระป๋อง" },
      { id: "can-minutemaid", name: "มินิทเมด", unit: "ขวด" },
    ],
  },
  {
    supplier: "เนสท์เล่",
    showTotal: true,
    rows: [
      { id: "nes-coffee-cold", name: "กาแฟ (เย็น)", unit: "ถุง" },
      { id: "nes-tea", name: "ชาเย็น", unit: "ถุง" },
      { id: "nes-tea-lemon", name: "ชามะนาว", unit: "ถุง" },
      { id: "nes-milo-3in1", name: "ไมโล 3in1", unit: "ถุง" },
      { id: "nes-milo-powder", name: "ไมโลผง", unit: "ถุง" },
      { id: "nes-sweet-burn", name: "สวีทไทม์", unit: "ถุง" },
      { id: "nes-whip", name: "วิปครีม", unit: "ถุง" },
      { id: "nes-nescafe-red", name: "เนสกาแฟ ริชอโรมา แดง", unit: "ซอง" },
      { id: "nes-nescafe-green", name: "เนสกาแฟ เอสเพรสโซ โรส เขียว", unit: "ซอง" },
      { id: "nes-ice-16", name: "น้ำแข็งเปล่า 16 ออนซ์", unit: "แก้ว" },
    ],
  },
  {
    supplier: "น้ำสมุนไพร",
    showTotal: true,
    showGrandTotal: true,
    rows: [
      { id: "herb-chrysanth", name: "น้ำเก๊กฮวย", unit: "กระบอก" },
      { id: "herb-longan", name: "น้ำลำไย", unit: "กระบอก" },
      { id: "herb-roselle", name: "น้ำกระเจี๊ยบ", unit: "กระบอก" },
      { id: "herb-butterfly", name: "น้ำอัญชันมะนาว", unit: "กระบอก" },
      { id: "herb-bael", name: "น้ำมะตูม", unit: "กระบอก" },
    ],
  },
  {
    supplier: "วัสดุอุปกรณ์",
    rows: [
      { id: "eq-water", name: "น้ำทิพย์", unit: "ขวด" },
      { id: "eq-cup-4", name: "แก้วชิม 4 ออนซ์", unit: "ใบ", countFront: true },
      { id: "eq-cup-9", name: "แก้ว 9 ออนซ์", unit: "ใบ", countFront: true },
      { id: "eq-cup-16", name: "แก้ว 16 ออนซ์", unit: "ใบ", countFront: true },
      { id: "eq-cup-22", name: "แก้ว 22 ออนซ์", unit: "ใบ", countFront: true },
      { id: "eq-cup-32", name: "แก้ว 32 ออนซ์", unit: "ใบ", countFront: true },
      { id: "eq-straw", name: "หลอดตรงสีขาว (ห่อ)", unit: "ห่อ" },
      { id: "eq-cup-clear", name: "แก้วใส", unit: "ใบ", countFront: true },
      { id: "eq-lid-clear", name: "ฝาใส", unit: "ใบ", lockZeroFrontRemain: true },
      { id: "eq-beer-can", name: "เบียร์ กระป๋อง", unit: "กระป๋อง" },
      { id: "eq-beer-small", name: "เบียร์ ขวดเล็ก", unit: "ขวด" },
      { id: "eq-beer-large", name: "เบียร์ ขวดใหญ่", unit: "ขวด" },
      { id: "eq-lid-16-22", name: "ฝา 16/22 OZ", unit: "ใบ", lockZeroFrontRemain: true },
      { id: "eq-lid-32", name: "ฝา 32 OZ", unit: "ใบ", lockZeroFrontRemain: true },
    ],
  },
];

export const ALL_ROWS = GROUPS.flatMap((g) => g.rows);

export type SheetValues = Record<string, Partial<Record<ColKey, string>>>;

export const num = (v?: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

type Cells = Partial<Record<ColKey, string>>;

/** หน่วยที่นับหน้าร้านไม่ได้ ยอดคงเหลือหน้าร้านจึงเป็น 0 */
const ZERO_FRONT_UNITS = ["กล่อง", "กระบอก", "ถุง", "ห่อ", "ใบ", "หลอด"];

export const isZeroFront = (row: Row) => !row.countFront && ZERO_FRONT_UNITS.includes(row.unit);

/** สินค้าเข้าหน้าร้าน = ยอดเบิกใช้ (แก้ทับได้) */
export const frontInValue = (r?: Cells) => (r?.frontIn?.trim() ? r.frontIn : (r?.used ?? ""));

export const remainStock = (r?: Cells, row?: Row) => {
  if (row?.lockZeroRemain) return 0;
  if (r?.remain?.trim()) return num(r.remain);
  return num(r?.carry) + num(r?.received) - num(r?.used);
};

export const remainFront = (r: Cells | undefined, row?: Row) => {
  if (row?.lockZeroRemain || row?.lockZeroFrontRemain) return 0;
  if (r?.frontRemain?.trim()) return num(r.frontRemain);
  if (row && isZeroFront(row)) return 0;
  return num(r?.frontCarry) + num(frontInValue(r)) - num(r?.sold);
};

/** ค่าที่แสดงในช่อง (รวมค่าที่คำนวณให้อัตโนมัติ) */
export const displayCell = (row: Row, r: Cells | undefined, col: ColKey): string => {
  if (col === "frontIn") return frontInValue(r) ?? "";
  if (col === "remain") {
    if (row.lockZeroRemain) return "0";
    if (r?.remain?.trim()) return r.remain;
    const has = r?.carry?.trim() || r?.received?.trim() || r?.used?.trim();
    return has ? String(remainStock(r)) : "";
  }
  if (col === "frontRemain") {
    if (row.lockZeroRemain || row.lockZeroFrontRemain) return "0";
    if (r?.frontRemain?.trim()) return r.frontRemain;
    if (isZeroFront(row)) return "0";
    const has = r?.frontCarry?.trim() || frontInValue(r)?.trim() || r?.sold?.trim();
    return has ? String(remainFront(r, row)) : "";
  }
  return r?.[col] ?? "";
};

/** โยกสต็อกไปวันถัดไป: คงเหลือ -> ยกมา, คงเหลือหน้าร้าน -> ยกมาหน้าร้าน */
export const rolloverValues = (values: SheetValues): SheetValues => {
  const next: SheetValues = {};
  for (const row of ALL_ROWS) {
    const cur = values[row.id];
    if (!cur) continue;
    const stock = remainStock(cur, row);
    const front = remainFront(cur, row);
    next[row.id] = {
      // ยกยอดมาทุกกรณี รวมถึงเลข 0 (ไม่ต้องมากรอกซ้ำเอง)
      carry: String(stock),
      frontCarry: String(front === 0 ? "" : front),
    };
  }
  return next;
};

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export const thaiParts = (d: Date) => ({
  day: String(d.getDate()),
  month: THAI_MONTHS[d.getMonth()],
  year: String(d.getFullYear() + 543),
});

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// หมายเหตุ: ข้อมูลถูกเก็บในฐานข้อมูลกลาง (ดู src/lib/stock-remote.ts)
// ไม่ใช้ localStorage แล้ว เพื่อให้ทุกเครื่อง/ทุกบัญชีเห็นข้อมูลชุดเดียวกัน

