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

const maxFileSize = 5 * 1024 * 1024;

export const POST = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปสินค้า", 401);
    }

    if (user.role !== "ADMIN" && user.role !== "RESELLER") {
      return apiError("บัญชีนี้ยังไม่มีสิทธิ์อัปโหลดรูปสินค้า", 403);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiError("ไม่พบไฟล์รูปภาพ", 400);
    }

    const extension = allowedMimeTypes.get(file.type);

    if (!extension) {
      return apiError("รองรับเฉพาะไฟล์ JPG, PNG และ WebP", 400);
    }

    if (file.size > maxFileSize) {
      return apiError("รูปภาพต้องมีขนาดไม่เกิน 5MB", 400);
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, fileName), bytes);

    return NextResponse.json({ ok: true, url: `/uploads/products/${fileName}` });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
