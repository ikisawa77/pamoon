import "dotenv/config";

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const jobToken = process.env.INTERNAL_JOB_TOKEN;

if (!appUrl) {
  throw new Error("กรุณาตั้งค่า NEXT_PUBLIC_APP_URL เป็น URL เว็บไซต์จริงก่อนรัน cron");
}

if (!jobToken) {
  throw new Error("กรุณาตั้งค่า INTERNAL_JOB_TOKEN ให้ตรงกับค่าในโฮสต์จริงก่อนรัน cron");
}

const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/internal/cards/sync`, {
  method: "POST",
  headers: {
    "x-job-token": jobToken,
  },
});

const payload = await response.text();

if (!response.ok) {
  throw new Error(`sync คลังการ์ดไม่สำเร็จ: ${response.status} ${payload}`);
}

console.log(payload);
