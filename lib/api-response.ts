import { NextResponse } from "next/server";
import { ZodError } from "zod";

interface ApiErrorBody {
  ok: false;
  message: string;
  details?: unknown;
}

export const apiError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json<ApiErrorBody>({ ok: false, message, details }, { status });

export const validationError = (error: ZodError) =>
  apiError("ข้อมูลที่ส่งมาไม่ถูกต้อง", 400, error.flatten());

export const unknownError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
  return apiError("ระบบหลังบ้านยังทำงานไม่สำเร็จ", 500, { message });
};
