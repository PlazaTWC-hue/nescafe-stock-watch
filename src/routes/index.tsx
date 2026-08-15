import { createFileRoute } from "@tanstack/react-router";

import { StockSheet } from "@/components/StockSheet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "แบบบันทึก STOCK วัตถุดิบ — ฝ่ายพลาซ่า สาขาสระบุรี" },
      {
        name: "description",
        content:
          "ระบบเช็คยอดสต็อกวัตถุดิบรายวัน ฝ่ายพลาซ่า สาขาสระบุรี เลือกดูย้อนหลังตามปฏิทิน และบันทึก/แชร์เป็น PNG หรือ PDF",
      },
      { property: "og:title", content: "แบบบันทึก STOCK วัตถุดิบ — ฝ่ายพลาซ่า สาขาสระบุรี" },
      {
        property: "og:description",
        content: "ระบบเช็คยอดสต็อกวัตถุดิบรายวัน ฝ่ายพลาซ่า สาขาสระบุรี เลือกดูย้อนหลังตามปฏิทิน และบันทึก/แชร์เป็น PNG หรือ PDF",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <StockSheet />
    </main>
  );
}
