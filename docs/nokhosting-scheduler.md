# ตั้ง Cron/Scheduler บน NokHosting

ใช้สำหรับอัปเดตคลังการ์ดจาก `data-cardgame.com` เข้าฐานข้อมูลของเว็บเป็นประจำ โดยไม่ต้องกดเองในหลังบ้าน

## Environment Variables

ตั้งค่าในโฮสต์จริงให้ครบ:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
INTERNAL_JOB_TOKEN=สุ่มเป็นข้อความยาวอย่างน้อย 32 ตัวอักษร
DATA_CARDGAME_SOURCE_URL=https://data-cardgame.com/prices_full.json
```

ค่า `INTERNAL_JOB_TOKEN` ต้องเป็นความลับ เพราะใช้อนุญาต job ภายในระบบ เช่น sync คลังการ์ด, SLA และ email flush

## Cron Command

ในหน้า Cron Job / Scheduler ของ NokHosting ให้ตั้งรันวันละครั้ง เช่น 03:15 น.

```bash
cd /home/YOUR_ACCOUNT/YOUR_APP && npm run cards:sync:cron
```

ถ้าโฮสต์ให้ตั้ง URL webhook แทน command ให้ยิง:

```text
POST https://your-domain.com/api/internal/cards/sync
Header: x-job-token: ค่าเดียวกับ INTERNAL_JOB_TOKEN
```

## ตรวจผล

1. เข้าหลังบ้าน `/admin`
2. เปิดแท็บ `คลังการ์ด`
3. ดูกล่อง `Sync คลังการ์ดจาก data-cardgame.com`
4. ตรวจ `ประวัติ sync ล่าสุด` ว่า status เป็น `COMPLETED`

## หมายเหตุ

- ปุ่ม `Sync ตอนนี้` ในหลังบ้านใช้ route เดียวกันกับ cron
- ตาราง dynamic สำหรับหลายเกมคือ `ExternalCardSet` และ `ExternalCardMaster`
- ตาราง marketplace ที่ใช้งานกับการลงขาย/ประมูลเดิมคือ `CardSet` และ `CardMaster`
