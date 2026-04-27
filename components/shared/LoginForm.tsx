"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loginSchema } from "@/lib/schemas";

interface LoginResponse {
  ok: boolean;
  user?: {
    role: string;
  };
  error?: {
    message: string;
  };
}

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
        setMessage(result.error?.message ?? "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      router.push(result.user?.role === "ADMIN" ? "/admin" : "/");
      router.refresh();
    } catch {
      setMessage("เชื่อมต่อระบบเข้าสู่ระบบไม่ได้");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>เข้าสู่ระบบหลังบ้าน</CardTitle>
        <CardDescription>ใช้บัญชีผู้ดูแลเพื่อจัดการสินค้า ร้านค้า และคำสั่งซื้อ</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <Button disabled={submitting} type="submit">
            <LogIn data-icon="inline-start" />
            {submitting ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export { LoginForm };
