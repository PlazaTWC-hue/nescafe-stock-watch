/** อ่านใบสรุปยอดขายด้วย AI แล้วคืนเฉพาะรายการที่อนุญาต */

export const SCAN_ITEMS = [
  { key: "promotion", label: "โปรโมชั่น (รายการ 'ซื้อโค้ก 32oz แก้วที่ 2 ราคา 15 บาท' หรือโปรโมชั่นแก้วที่ 2)" },
  { key: "canCoke", label: "โค้ก กระป๋อง (ชื่อต้องลงท้ายด้วย 'กระป๋อง')" },
  { key: "canCokeZero", label: "โค้ก ซีโร่ กระป๋อง (ชื่อต้องลงท้ายด้วย 'กระป๋อง')" },
  { key: "canRed", label: "แฟนต้าแดง กระป๋อง (ชื่อต้องลงท้ายด้วย 'กระป๋อง')" },
  { key: "canGreen", label: "แฟนต้าเขียว/น้ำเขียว กระป๋อง (ชื่อต้องลงท้ายด้วย 'กระป๋อง')" },
  { key: "canOrange", label: "แฟนต้าส้ม กระป๋อง (ชื่อต้องลงท้ายด้วย 'กระป๋อง')" },
  { key: "canSprite", label: "สไปรท์ กระป๋อง (ชื่อต้องลงท้ายด้วย 'กระป๋อง')" },
  { key: "canSchweppes", label: "ชเวปส์ ขวด" },
  { key: "canGrape", label: "องุ่น/แฟนต้าองุ่น กระป๋อง (ชื่อต้องลงท้ายด้วย 'กระป๋อง')" },
  { key: "canMinutemaid", label: "มินิทเมด ขวด" },
  { key: "water", label: "น้ำทิพย์ (น้ำดื่มขวด)" },
  { key: "cup16", label: "น้ำอัดลมแก้ว 16oz (ชื่อรายการลงท้ายด้วย 16oz / 16 ออนซ์)" },
  { key: "cup22", label: "น้ำอัดลมแก้ว 22oz (ชื่อรายการลงท้ายด้วย 22oz / 22 ออนซ์)" },
  { key: "cup32", label: "น้ำอัดลมแก้ว 32oz (ชื่อรายการลงท้ายด้วย 32oz / 32 ออนซ์)" },
  { key: "ice16", label: "น้ำแข็งเปล่า 16oz" },
] as const;


export type ScanKey = (typeof SCAN_ITEMS)[number]["key"];
export type ScanResult = Partial<Record<ScanKey, number>>;

