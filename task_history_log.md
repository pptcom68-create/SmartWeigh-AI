# Task History Log — AutoStore & Order Management System

> บันทึกประวัติการแก้ไขโค้ดทุกครั้ง ก่อนส่งมอบงาน (ตามกฎข้อ 4)

---

## [2026-10-01] ทวนโค้ดทั้งโปรเจกต์ (Code Review — ไม่มีการแก้ไขโค้ด)

- **สถานะ:** งานตรวจทาน/ทำความเข้าใจระบบ — ไม่มีการแก้ไขโค้ดในครั้งนี้
- **ขอบเขต:** อ่านโค้ดครบทุกไฟล์ (server.ts, src/App.tsx, src/types.ts, components 14 ไฟล์, utils 2 ไฟล์, config ทั้งหมด)
- **ผลสรุป:**
  - โครงสร้าง: Express + Vite (server.ts) เป็น Backend proxy เรียก Gemini API 2 endpoint (/api/scan-bill, /api/scan-po) + React SPA (App.tsx) เก็บข้อมูลบน localStorage 3 ชุด (orders/stores/pos)
  - จุดเสี่ยงที่พบ (รายละเอียดในบทสรุปที่ส่งมอบ):
    1. localStorage เป็นฐานข้อมูลหลัก — เสี่ยง quota overflow จากภาพ base64 + ข้อมูลหายเมื่อล้างเบราว์เซอร์
    2. /api/scan-bill ไม่มี auth/rate-limit — เสี่ยงถูกยิงกินโควตา Gemini
    3. ยอดรวมร้านค้า (totalPurchases/totalDebt) คำนวณสองระบบซ้อนทับกัน — UI คำนวณสด แต่ Excel export ใช้ค่าเก่าใน store object → ข้อมูลขัดแย้งกันเอง
    4. externalFilter ของ TableView39Cols sync ครั้งเดียวตอน mount — คลิกการ์ด KPI ซ้ำขณะอยู่แท็บเดิมแล้วฟิลเตอร์ไม่อัปเดต
    5. ปุ่ม "เปิด PO" ในหน้าร้านค้าเรียก onAddNewOrderForStore (สร้างตั๋ว ไม่ใช่ PO) — ชื่อ/พฤติกรรมไม่ตรงกัน
    6. confidence: 0.98 เป็นค่า hardcode ปลอม
- **ไฟล์ที่แก้:** ไม่มี (สร้าง task_history_log.md เท่านั้น)
