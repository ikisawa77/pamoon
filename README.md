# pamoon

Pamoon คือเว็บประมูลและซื้อขายการ์ดสะสมภาษาไทย พัฒนาจาก prototype เดิมให้เป็นโปรเจกต์จริงด้วย Next.js 15, TypeScript strict, Tailwind CSS, shadcn/ui, Lucide React และ Zod

## พัฒนาอะไรไปแล้ว

- สร้างโครงโปรเจกต์ Next.js 15 App Router พร้อม TypeScript strict mode
- ตั้งค่า Tailwind CSS v4 และ shadcn/ui โดยใช้ Radix UI เป็น component primitive
- ใช้ฟอนต์ Sukhumvit Set แบบ local ผ่าน `next/font/local`
- ทำหน้า marketplace สำหรับประมูลการ์ดตามภาพอ้างอิง
- ทำ sidebar ตัวกรองสินค้า เช่น ประเภทสินค้า หมวดหมู่ ซีรีส์ ระดับความหายาก และช่วงราคา
- ทำการ์ดสินค้าแบบประมูล มีเวลานับถอยหลัง ราคาเปิด ราคาปัจจุบัน ผู้เสนอสูงสุด และจำนวนผู้ติดตาม
- ทำ panel กระเป๋าเงิน แสดงยอดเงินคงเหลือ รายการรอชำระ และวงเงินประมูล
- ทำ flow เติมเงินแบบ mock ด้วย state ในหน้าเว็บ
- ทำ flow เสนอราคาแบบ mock พร้อมอัปเดตวงเงินประมูลและรายการล่าสุด
- ทำ flow สมัครร้านค้าแบบ mock
- ทำ drawer ลงสินค้าแบบ step form พร้อม validation ด้วย Zod
- เพิ่มข้อมูลตัวอย่างตามแนว filter ของ `data-cardgame.com` โดยมี 3 ร้านค้า, รายการซื้อเลย 80 ใบ, รายการประมูล 80 ใบ และครอบคลุม RARITY `C`, `UC`, `R`, `L`, `SR`, `SEC`, `SP`, `P`
- เริ่มระบบหลังบ้านด้วย Prisma 7 + MariaDB adapter สำหรับเชื่อมฐานข้อมูล MySQL/MariaDB
- เพิ่ม database schema สำหรับสมาชิก ร้านค้า สินค้า ประมูล bid wallet transaction และ order
- เพิ่ม API routes ชุดแรกสำหรับ health check, shops, products, bids และ wallet top-up
- เพิ่ม seed script สำหรับสร้างสมาชิกตัวอย่าง ร้านค้า 3 ร้าน และสินค้า 160 ใบลงฐานข้อมูลจริง
- แยกโครงสร้างไฟล์ตามมาตรฐาน `/app`, `/components/ui`, `/components/shared`, `/lib`, `/types`
- เพิ่ม `.env.example` สำหรับเตรียมต่อฐานข้อมูล ระบบ auth และ payment provider ในขั้นถัดไป
- เพิ่มเอกสาร deploy สำหรับ NokHosting Node.js Hosting

## ตอนนี้ทำถึงไหนแล้ว

- สถานะปัจจุบันเป็น frontend prototype ที่พร้อมรันใน Next.js แล้ว
- ข้อมูลสินค้า 160 ใบ กระเป๋าเงิน ร้านค้า 3 ร้าน และรายการล่าสุดยังเป็น mock data ใน `lib/mock-data.ts`
- การเติมเงิน เสนอราคา สมัครร้านค้า และลงสินค้าเป็น local state ยังไม่ได้เชื่อม backend จริง
- ฝั่ง backend มี Prisma schema และ API routes แล้ว แต่ยังต้องตั้งค่า `DATABASE_URL` และรัน `npm run db:push` ก่อนใช้งานฐานข้อมูลจริง
- ผ่านการตรวจ `npm run lint`, `npm run typecheck` และ `npm run build`
- ตั้งค่า `next.config.ts` เป็น `output: "standalone"` เพื่อเตรียม deploy บน Node.js hosting

## ต่อไปต้องทำอะไรต่อ

- ออกแบบฐานข้อมูลจริงสำหรับผู้ใช้ ร้านค้า สินค้า การประมูล bid wallet ledger order และ transaction
- เชื่อมฐานข้อมูล MariaDB/MySQL จริงบน hosting และรัน seed ข้อมูลเริ่มต้น
- ทำระบบสมัครสมาชิกและเข้าสู่ระบบ
- ทำ role แยกสมาชิกทั่วไป ร้านค้า และ admin
- ทำ API routes หรือ Server Actions สำหรับลงสินค้า เสนอราคา ซื้อสินค้า เติมเงิน และถอนเงิน
- เชื่อม payment/top-up provider จริง พร้อม webhook และ ledger ที่ตรวจสอบย้อนหลังได้
- ทำระบบกันวงเงินประมูล คืนวงเงิน และปิดประมูลอัตโนมัติ
- ทำหน้า dashboard ร้านค้าและหน้า admin ตรวจสอบร้านค้า/สินค้า
- เพิ่มระบบ upload รูปสินค้าและจัดเก็บไฟล์จริง
- เพิ่ม test สำหรับ business logic สำคัญ เช่น bid, wallet ledger และ order lifecycle
- เตรียม production environment variables บน NokHosting

## คำสั่งใช้งาน

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm start
npm run prisma:generate
npm run db:push
npm run db:seed
npm run db:studio
```

## ระบบหลังบ้าน

ไฟล์สำคัญของ backend:

- `prisma/schema.prisma` โครงสร้างฐานข้อมูล
- `prisma.config.ts` config Prisma 7 และ `DATABASE_URL`
- `prisma/seed.ts` seed ข้อมูลตัวอย่างลงฐานข้อมูล
- `lib/db/prisma.ts` Prisma client สำหรับ Next.js runtime
- `app/api/health/route.ts` ตรวจสอบระบบและฐานข้อมูล
- `app/api/products/route.ts` อ่าน/สร้างสินค้า
- `app/api/shops/route.ts` อ่านร้านค้า
- `app/api/bids/route.ts` เสนอราคาประมูล
- `app/api/wallet/top-up/route.ts` เติมเงินแบบ API

การเริ่มใช้ฐานข้อมูลจริง:

```bash
copy .env.example .env
# แก้ DATABASE_URL ให้เป็นฐานข้อมูล MariaDB/MySQL จริง
npm install
npm run db:push
npm run db:seed
npm run dev
```

ตัวอย่างตรวจ health:

```bash
curl http://localhost:3000/api/health
```

## เปิดทดสอบบนเครื่องนี้ด้วยไฟล์ .bat

- ดับเบิลคลิก `start-localhost.bat` เพื่อเปิดระบบหน้าเว็บและฝั่ง server ของ Next.js บน `http://localhost:3000`
- ดับเบิลคลิก `stop-localhost.bat` เพื่อปิดระบบที่รันอยู่บน port `3000`
- logic หลักอยู่ใน `scripts/start-localhost.ps1` และ `scripts/stop-localhost.ps1` เพื่อให้ batch file สั้นและเสถียรกว่า
- ไฟล์ log ขณะรันอยู่ที่ `.localhost.log`
- หากยังไม่มี `node_modules` ไฟล์ `start-localhost.bat` จะรัน `npm install` ให้ก่อน

## โครงสร้างโปรเจกต์

- `app/` routes, layout, global CSS และ local fonts
- `components/ui/` shadcn/ui primitives
- `components/shared/` components เฉพาะธุรกิจของเว็บ
- `lib/` mock data, schemas และ utilities
- `types/` shared TypeScript types
- `public/assets/` asset ภาพสินค้าและภาพ concept

## หมายเหตุสำหรับ deploy

ดูรายละเอียดใน `DEPLOYMENT.md`
