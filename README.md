# ระบบ Dashboard ค่าคอมรถยนต์

Dashboard สำหรับติดตามค่าคอมมิชชั่นการขายรถยนต์แยกตามแบรนด์ รองรับการอัปโหลดไฟล์ Excel รายคัน สร้างรายงาน และเปรียบเทียบยอดขายระหว่างรอบวางบิล

Stack: React (Vite) + Tailwind CSS ฝั่ง frontend, Express + PostgreSQL ฝั่ง backend — รันเป็นเซอร์วิสเดียว

## เริ่มต้นใช้งาน (local dev)

1. ติดตั้ง dependencies:
   ```bash
   npm install
   ```
2. คัดลอก `.env.example` เป็น `.env` แล้วใส่ `DATABASE_URL` ของ Postgres (เช่น connection string แบบ public จาก Railway)
3. สร้างตารางในฐานข้อมูลครั้งแรก:
   ```bash
   npm run db:migrate
   ```
   หรือถ้าต้องการข้อมูลตัวอย่างไปทดสอบด้วย:
   ```bash
   npm run db:seed
   ```
4. รันแอป (frontend + backend พร้อมกัน):
   ```bash
   npm run dev
   ```
   เปิด http://localhost:5173

## Deploy ขึ้น Railway

1. สร้างโปรเจกต์ใน Railway พร้อม PostgreSQL plugin
2. เพิ่ม service ใหม่จาก GitHub repo นี้ ตั้งค่า environment variable `DATABASE_URL` ให้อ้างอิงจาก Postgres plugin
3. รัน migration ครั้งแรก: `railway run npm run db:migrate`
4. Railway จะรัน `npm run build` และ `npm start` ให้อัตโนมัติ

## โครงสร้างโปรเจกต์

- `src/` — React frontend
- `server/` — Express API + การเชื่อมต่อฐานข้อมูล
- `server/schema.sql` — โครงสร้างตาราง (months, brands, records)
