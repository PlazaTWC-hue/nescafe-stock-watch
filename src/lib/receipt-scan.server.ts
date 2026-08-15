import { SCAN_ITEMS, type ScanResult } from "./receipt-scan-items";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const properties = Object.fromEntries(
  SCAN_ITEMS.map((i) => [i.key, { type: "number", description: `จำนวนที่ขายได้ของ ${i.label}` }]),
);

const SYSTEM =
  "คุณคือผู้ช่วยอ่านใบสรุปยอดขาย (ภาษาไทย) จากรูปถ่าย " +
  "อ่านทุกบรรทัดในรูปอย่างละเอียด รวมถึงตัวเลขที่พิมพ์เบาหรือเอียง " +
  "ให้ดึงเฉพาะจำนวนที่ขายได้ (จำนวนหน่วย/ชิ้น ไม่ใช่ยอดเงิน ไม่ใช่ราคาต่อหน่วย) ของรายการที่กำหนดในเครื่องมือเท่านั้น " +
  "กฎสำคัญ: " +
  "(1) รายการน้ำอัดลมแก้ว ให้จับเฉพาะชื่อที่ลงท้ายด้วยขนาดแก้ว 16oz / 22oz / 32oz (หรือ 16 ออนซ์ / 22 ออนซ์ / 32 ออนซ์) แล้วรวมทุกรสของขนาดเดียวกันเข้าช่องขนาดนั้น " +
  "(2) รายการโปรโมชั่น เช่น 'ซื้อโค้ก 32oz แก้วที่ 2 ราคา 15 บาท' หรือโปรโมชั่นแก้วที่ 2 ให้ใส่จำนวนลงช่องโปรโมชั่น ห้ามนำไปรวมกับแก้ว 32oz " +
  "(3) น้ำอัดลมกระป๋อง ให้จับเฉพาะชื่อที่ลงท้ายด้วยคำว่า 'กระป๋อง' (หรือ 'ขวด' สำหรับชเวปส์/มินิทเมด) ห้ามนำยอดของกระป๋องไปใส่ช่องแบบแก้ว และห้ามนำยอดแบบแก้วมาใส่ช่องกระป๋อง " +
  "(4) น้ำทิพย์ (น้ำดื่มขวด) ให้ใส่ช่องน้ำทิพย์ " +
  "(5) นอกเหนือจากนี้ห้ามใส่เลย เช่น กาแฟ/เครื่องดื่มร้อน ชา นม เบเกอรี่ รีฟิว กระบอกน้ำ ของแถม ห้ามสรุปหรือเดา " +
  "ถ้ารายการเดียวกันมีหลายบรรทัด ให้รวมจำนวนกัน " +
  "รายการใดที่ไม่ปรากฏในใบสรุปเลย ให้ละเว้น ห้ามเดา ห้ามใส่ 0";


async function callGateway(
  apiKey: string,
  model: string,
  imageDataUrl: string,
): Promise<Record<string, unknown> | undefined> {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "อ่านใบสรุปยอดนี้ให้ครบทุกบรรทัด แล้วส่งจำนวนที่ขายได้ของรายการที่กำหนด",
            },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "report_sales",
            description: "ส่งจำนวนที่ขายได้ของแต่ละรายการ",
            parameters: { type: "object", properties, additionalProperties: false },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "report_sales" } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`gateway ${res.status}: ${text.slice(0, 300)}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }

  const json = (await res.json()) as {
    choices?: {
      message?: { content?: string; tool_calls?: { function?: { arguments?: string } }[] };
    }[];
  };
  const msg = json.choices?.[0]?.message;
  const args = msg?.tool_calls?.[0]?.function?.arguments ?? msg?.content;
  if (!args) return undefined;
  try {
    const parsed = JSON.parse(args) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ถ้ารุ่นเร็วอ่านไม่ออก ค่อยส่งรูปเดิมให้รุ่นที่ละเอียดกว่า */
const MODELS = ["google/gemini-3.6-flash", "google/gemini-2.5-pro"];

/** อ่านคีย์จากทุกที่ที่รันไทม์อาจเก็บไว้ (process.env หรือ binding ของ worker) */
function readApiKey(): string | undefined {
  const fromProcess = process.env["LOVABLE_API_KEY"];
  if (fromProcess) return fromProcess;
  const g = globalThis as Record<string, unknown>;
  for (const holder of [g["env"], g["__env__"], (g["Cloudflare"] as Record<string, unknown> | undefined)?.["env"]]) {
    if (holder && typeof holder === "object") {
      const v = (holder as Record<string, unknown>)["LOVABLE_API_KEY"];
      if (typeof v === "string" && v) return v;
    }
  }
  return undefined;
}

export async function scanReceipt(imageDataUrl: string): Promise<ScanResult> {
  const apiKey = readApiKey();
  if (!apiKey) throw new Error("ระบบ AI ยังไม่พร้อมใช้งาน");

  let lastError: unknown;
  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    try {
      const parsed = await callGateway(apiKey, MODELS[attempt]!, imageDataUrl);
      if (parsed) {
        const out: ScanResult = {};
        for (const item of SCAN_ITEMS) {
          const v = Number(parsed[item.key]);
          if (Number.isFinite(v) && v > 0) out[item.key] = Math.round(v);
        }
        if (Object.keys(out).length > 0) return out;
      }
      lastError = new Error("อ่านตัวเลขจากรูปไม่ได้");
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number }).status;
      // คำขอผิดหรือเครดิตหมด การส่งซ้ำจะได้ผลเดิม
      if (status === 400 || status === 401 || status === 402 || status === 403) break;
    }
    if (attempt < MODELS.length - 1) await sleep(700 * (attempt + 1));
  }

  const status = (lastError as { status?: number } | undefined)?.status;
  if (status === 429) throw new Error("ระบบ AI ใช้งานหนักอยู่ รอสักครู่แล้วลองอีกครั้ง");
  if (status === 402) throw new Error("เครดิต AI หมด กรุณาเติมเครดิต");
  if (status === 401 || status === 403) throw new Error("ระบบ AI ยังเชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  if (status === 400) throw new Error("รูปนี้ส่งให้ระบบอ่านไม่ได้ กรุณาถ่ายใหม่ให้เห็นกระดาษเต็มแผ่น");
  throw new Error("อ่านตัวเลขจากรูปไม่ได้ ลองถ่ายให้ชัด/ตรง แล้วลองอีกครั้ง");
}
