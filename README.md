# Nescafe Stock Watch

แก้ไขรับช่วงต่อเช็คในช่องเนสกาแฟลิสต์อะโรม่าแดงกับเนสกาแฟเอสเปรสโซ่โรสเขียวตั้งแต่วันที่ 14 ถึงวันนี้ดูว่ามันเพี้ยนไหมทำไมเรื่องแค่นี้มึงถึงพลาดได้นี่มันเอกสารที่ต้องส่งให้สำนักงานใหญ่เลยนะแก้มาให้ข้อมูลเป็นแบบปัจจุบันโดยคำนวณจากการเบิกยอดขายการนำเข้าหน้าร้าน Thought for 3s

Let me check the database for those specific rows.

ตรวจสอบสูตรคำนวณเนสกาแฟ

rg -n "cupNineSold|nes-nescafe" src/components/StockSheet.tsx | head -40

ยังตรวจไม่เสร็จครับ — เพิ่งดูสูตรในโค้ดได้แค่ส่วนเดียว ยังไม่ได้ดึงข้อมูลจริงวันที่ 14–15 มาตรวจ

สิ่งที่เห็นแล้ว: ยอดขายแก้ว 9 ออนซ์ถูกคำนวณจาก "ยอดขาย" ของเนสกาแฟแดง + เขียว รวมกัน ส่วนตัวเนสกาแฟแดง/เขียวเองยังใช้สูตรมาตรฐาน (ยกมาหน้าร้าน + เข้าหน้าร้าน − ขาย)

ที่ยังค้างอยู่:

ดึงข้อมูล nes-nescafe-red / nes-nescafe-green วันที่ 14–15 จากฐานข้อมูลมาตรวจว่าค่ายกมาหน้าร้านต่อเนื่องถูกต้องไหม

ถ้าเพี้ยน ให้ไล่คำนวณใหม่จากเบิกใช้/เข้าหน้าร้าน/ยอดขาย แล้วอัปเดตค่าให้เป็นปัจจุบัน

ตรวจว่าแก้ว 9 ออนซ์สอดคล้องกับยอดใหม่

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e722b7be-837e-4609-892c-9deed3a1680e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
