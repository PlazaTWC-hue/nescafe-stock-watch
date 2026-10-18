import { describe, expect, test } from "bun:test";
import { decodeLayout, encodeLayout } from "./stock-layout";
import { buildGroups, GROUPS } from "./stock-sheet";

describe("shared product order", () => {
  test("persists the full equipment order without exceeding database value limits", () => {
    const o = GROUPS[4].rows.map(row => row.id).reverse().join(",");
    const cells = encodeLayout({ id: "order-4", o });
    expect(o.length).toBeGreaterThan(32);
    expect(Object.values(cells).every(value => value.length <= 32)).toBe(true);
    expect(decodeLayout("order-4", cells).o).toBe(o);
    expect(buildGroups([decodeLayout("order-4", cells)])[4].rows.map(row => row.id).join(",")).toBe(o);
  });
  test("Chang mineral water appears immediately below Namthip after reading saved order", () => {
    const ids = GROUPS[4].rows.map(row => row.id);
    ids.splice(ids.indexOf("eq-water") + 1, 0, "chang");
    const order = decodeLayout("order-4", encodeLayout({ id: "order-4", o: ids.join(",") }));
    const rows = buildGroups([{ id: "chang", g: "4", n: "น้ำแร่ช้าง", u: "ขวด" }, order])[4].rows;
    expect(rows[rows.findIndex(row => row.id === "eq-water") + 1].name).toBe("น้ำแร่ช้าง");
  });
});