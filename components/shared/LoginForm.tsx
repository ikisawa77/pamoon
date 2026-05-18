"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema } from "@/lib/schemas";

interface LoginResponse {
  ok: boolean;
  message?: string;
  user?: {
    role: AuthRole;
  };
}

type AuthRole = "ADMIN" | "RESELLER" | "MEMBER";

const demoAccounts = [
  { label: "Admin", email: "ikisawa77@gmail.com", hint: "จัดการหลังบ้านทั้งหมด" },
  { label: "Member", email: "member@example.local", hint: "ซื้อและร่วมประมูล" },
  { label: "Reseller", email: "cardhunter@example.local", hint: "ลงขายและเปิดประมูล" },
];

const getRedirectPath = (role?: AuthRole) => {
  if (role === "ADMIN") return "/admin";
  if (role === "RESELLER") return "/account/seller";
  return "/account";
};

const LoginForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("ikisawa77@gmail.com");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      setMessage("กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as LoginResponse;

      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      router.push(getRedirectPath(result.user?.role));
      router.refresh();
    } catch {
      setMessage("เชื่อมต่อระบบเข้าสู่ระบบไม่ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-[28px] border bg-white p-5 shadow-2xl shadow-slate-950/10 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <Badge className="mb-3 bg-slate-950 text-white">Admin / Reseller / Member</Badge>
          <h3 className="text-2xl font-bold">เข้าสู่ระบบ</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">ใช้บัญชีเดียวเพื่อเข้า marketplace, ร้านค้า หรือหลังบ้านตามสิทธิ์</p>
        </div>
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LockKeyhole className="size-5" />
        </span>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Input
          autoComplete="email"
          inputMode="email"
          placeholder="อีเมล"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          autoComplete="current-password"
          placeholder="รหัสผ่าน"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {message ? <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{message}</p> : null}
        <Button disabled={submitting} type="submit" size="lg" className="rounded-xl">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitting ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"}
          {!submitting ? <ArrowRight data-icon="inline-end" /> : null}
        </Button>
      </form>

      <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-primary" />
          บัญชีสำหรับทดสอบ
        </div>
        <div className="grid gap-2">
          {demoAccounts.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => setEmail(account.email)}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white"
            >
              <span>
                <span className="block font-semibold">{account.label}</span>
                <span className="block text-xs text-muted-foreground">{account.hint}</span>
              </span>
              <span className="text-right text-xs text-muted-foreground">{account.email}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>ยังไม่มีบัญชี?</span>
        <Button asChild variant="link" className="h-auto p-0">
          <Link href="/register">สมัครสมาชิกใหม่</Link>
        </Button>
      </div>
    </div>
  );
};

export { LoginForm };
