import type { LayoutEntry } from "./stock-sheet";

/** Keep each configuration value within the stock table's 32-character limit. */
export function encodeLayout(entry: LayoutEntry): Record<string, string> {
  const { id: _id, o, ...fields } = entry;
  const cells: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) cells[key] = value;
  }
  if (o !== undefined) {
    const chunks = o.match(/.{1,32}/g) ?? [""];
    if (chunks.length > 29) throw new Error("รายการสินค้าในหมวดนี้มีจำนวนมากเกินกำหนด");
    chunks.forEach((chunk, i) => { cells[i === 0 ? "o" : `o${i}`] = chunk; });
  }
  return cells;
}

export function decodeLayout(id: string, cells: Record<string, string>): LayoutEntry {
  const { g, n, u, x } = cells;
  let o = cells.o;
  if (o !== undefined) {
    for (let i = 1; cells[`o${i}`] !== undefined; i++) o += cells[`o${i}`];
  }
  return { id, g, n, u, x, o };
}