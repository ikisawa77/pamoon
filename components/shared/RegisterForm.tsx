"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck, Store, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { registerSchema } from "@/lib/schemas";

type RegisterRole = "MEMBER" | "RESELLER";

interface RegisterResponse {
  ok: boolean;
  message?: string;
  nextUrl?: string;
  user?: {
    role: RegisterRole | "ADMIN";
  };
}

const roleOptions: Array<{
  role: RegisterRole;
  title: string;
  description: string;
  icon: typeof UserRound;
}> = [
  {
    role: "MEMBER",
    title: "Member",
    description: "ซื้อสินค้า เข้าร่วมประมูล เติมเงิน และติดตามรายการโปรด",
    icon: UserRound,
  },
  {
    role: "RESELLER",
    title: "Reseller",
    description: "เปิดร้าน ลงขายสินค้า เปิดประมูล และซื้อ/ประมูลได้เหมือนสมาชิก",
    icon: Store,
  },
];

const RegisterForm = () => {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<RegisterRole>("MEMBER");
  const [shopName, setShopName] = useState("");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const roleLabel = useMemo(() => (role === "RESELLER" ? "Reseller" : "Member"), [role]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setSuccessMessage("");

    const parsed = registerSchema.safeParse({
      displayName,
      email,
      password,
      confirmPassword,
      role,
      shopName: role === "RESELLER" ? shopName : undefined,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบข้อมูลให้ครบถ้วน";
      setMessage(firstError);
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

      setSuccessMessage(`สร้างบัญชี ${roleLabel} สำเร็จ กำลังพาไปหน้าใช้งาน`);
      router.push(result.nextUrl ?? "/account");
      router.refresh();
    } catch {
      setMessage("เชื่อมต่อระบบสมัครสมาชิกไม่ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] border bg-white p-5 shadow-2xl shadow-slate-950/8 sm:p-6">
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {roleOptions.map((option) => {
          const active = role === option.role;

          return (
            <button
              key={option.role}
              type="button"
              onClick={() => setRole(option.role)}
              className={cn(
                "rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:bg-primary/5",
                active && "border-primary bg-primary/8 shadow-lg shadow-primary/10",
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <option.icon className="size-5" />
                </span>
                {active ? <CheckCircle2 className="size-5 text-primary" /> : null}
              </div>
              <p className="font-bold">{option.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{option.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4">
        <Input
          autoComplete="name"
          placeholder="ชื่อที่แสดง"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <Input
          autoComplete="email"
          inputMode="email"
          placeholder="อีเมล"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {role === "RESELLER" ? (
          <Input
            autoComplete="organization"
            placeholder="ชื่อร้านค้า"
            value={shopName}
            onChange={(event) => setShopName(event.target.value)}
          />
        ) : null}
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
      {successMessage ? <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</p> : null}

      <div className="mt-5 rounded-2xl border bg-slate-50 p-4 text-sm leading-6 text-muted-foreground">
        <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
          <ShieldCheck className="size-4 text-primary" />
          สิทธิ์หลังสมัคร
        </div>
        {role === "RESELLER"
          ? "ระบบจะสร้างร้านค้าสถานะอนุมัติให้ทันทีสำหรับทดสอบ ลงขายและประมูลได้จากเมนูลงสินค้า"
          : "บัญชี Member สามารถซื้อสินค้า เข้าร่วมประมูล เติมเงิน และสมัคร Reseller เพิ่มภายหลังได้"}
      </div>

      <Button type="submit" size="lg" className="mt-5 w-full rounded-xl" disabled={submitting}>
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {submitting ? "กำลังสร้างบัญชี" : `สร้างบัญชี ${roleLabel}`}
      </Button>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>มีบัญชีอยู่แล้ว?</span>
        <Button asChild variant="link" className="h-auto p-0">
          <Link href="/login">เข้าสู่ระบบ</Link>
        </Button>
      </div>
      <Badge className="mt-4 bg-slate-950 text-white">Admin ใช้บัญชีที่สร้างไว้ในระบบเพื่อเข้าสู่หลังบ้าน</Badge>
    </form>
  );
};

export { RegisterForm };
