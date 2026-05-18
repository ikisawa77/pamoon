"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck, Store, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerSchema } from "@/lib/schemas";

interface RegisterResponse {
  ok: boolean;
  message?: string;
  nextUrl?: string;
}

const RegisterForm = () => {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setSuccessMessage("");

    const parsed = registerSchema.safeParse({
      displayName,
      email,
      password,
      confirmPassword,
      role: "MEMBER",
    });

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบข้อมูลให้ครบถ้วน");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as RegisterResponse;

      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "สมัครสมาชิกไม่สำเร็จ");
        return;
      }

      setSuccessMessage("สร้างบัญชีสมาชิกสำเร็จ กำลังพาไปหน้าบัญชีของฉัน");
      router.push(result.nextUrl ?? "/account");
      router.refresh();
    } catch {
      setMessage("เชื่อมต่อระบบสมัครสมาชิกไม่ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-slate-950/20 sm:p-6">
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/45 bg-primary/10 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white">
              <UserRound className="size-5" />
            </span>
            <CheckCircle2 className="size-5 text-primary" />
          </div>
          <p className="font-bold">สมาชิกทั่วไป</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">ซื้อสินค้า เข้าร่วมประมูล เติมเงิน และจัดการรายการโปรดได้ทันที</p>
        </div>
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Store className="size-5" />
            </span>
            <Badge variant="outline">สมัครภายหลัง</Badge>
          </div>
          <p className="font-bold">เปิดร้านค้า</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">สมัครสมาชิกก่อน แล้วไปเมนูบัญชีของฉันเพื่อส่งคำขอเปิดร้านให้ผู้ดูแลอนุมัติ</p>
        </div>
      </div>

      <div className="grid gap-4">
        <Input autoComplete="name" placeholder="ชื่อที่แสดง" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        <Input
          autoComplete="email"
          inputMode="email"
          placeholder="อีเมล"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            autoComplete="new-password"
            placeholder="รหัสผ่านอย่างน้อย 6 ตัว"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            autoComplete="new-password"
            placeholder="ยืนยันรหัสผ่าน"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
      </div>

      {message ? <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{message}</p> : null}
      {successMessage ? <p className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{successMessage}</p> : null}

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-muted-foreground">
        <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
          <ShieldCheck className="size-4 text-primary" />
          ขั้นตอนเปิดร้านค้า
        </div>
        หลังสมัครสมาชิกแล้ว ให้เข้าเมนู “สมัครร้านค้า” เพื่อยืนยันเบอร์โทรศัพท์ด้วย OTP กรอกบัญชีธนาคารและที่อยู่ จากนั้นรอผู้ดูแลอนุมัติก่อนลงขายหรือเปิดประมูล
      </div>

      <Button type="submit" size="lg" className="mt-5 w-full rounded-xl" disabled={submitting}>
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {submitting ? "กำลังสร้างบัญชี" : "สร้างบัญชีสมาชิก"}
      </Button>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>มีบัญชีอยู่แล้ว?</span>
        <Button asChild variant="link" className="h-auto p-0">
          <Link href="/login">เข้าสู่ระบบ</Link>
        </Button>
      </div>
    </form>
  );
};

export { RegisterForm };
