import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";

export const runtime = "nodejs";

const allowedMimeTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

const allowedKinds = new Set(["logo", "bank-book"]);
const maxFileSize = 5 * 1024 * 1024;

export const POST = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนอัปโหลดเอกสารร้านค้า", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") ?? "document");

    if (!(file instanceof File)) {
      return apiError("ไม่พบไฟล์ที่ต้องการอัปโหลด", 400);
    }

    if (!allowedKinds.has(kind)) {
      return apiError("ประเภทเอกสารไม่ถูกต้อง", 400);
    }

    const extension = allowedMimeTypes.get(file.type);

    if (!extension) {
      return apiError("รองรับเฉพาะไฟล์ JPG, PNG และ WebP", 400);
    }

    if (file.size > maxFileSize) {
      return apiError("ไฟล์ต้องมีขนาดไม่เกิน 5MB", 400);
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "seller");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${kind}-${user.id}-${Date.now()}-${randomUUID()}${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, fileName), bytes);

    return NextResponse.json({ ok: true, url: `/uploads/seller/${fileName}` });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
