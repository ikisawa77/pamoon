"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Phone,
  Store,
  UploadCloud,
  UserRound,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sellerApplicationSchema } from "@/lib/schemas";

type ShopStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

interface SellerShopSnapshot {
  id: string;
  name: string;
  slug: string;
  status: ShopStatus;
  description: string | null;
  hasPhysicalStore: boolean;
  logoUrl: string | null;
  applicantFirstName: string | null;
  applicantLastName: string | null;
  phone: string | null;
  phoneVerifiedAt: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankBookImageUrl: string | null;
  addressLine: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
}

interface SellerApplicationWizardProps {
  userEmail: string;
  displayName: string;
  initialShop: SellerShopSnapshot | null;
}

interface SellerFormState {
  shopName: string;
  description: string;
  hasPhysicalStore: boolean;
  logoUrl: string;
  firstName: string;
  lastName: string;
  phone: string;
  bankName: string;
  bankBranch: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBookImageUrl: string;
  addressLine: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  acceptedTerms: boolean;
}

interface ApiResponse {
  ok: boolean;
  message?: string;
  devCode?: string;
}

const steps = [
  { label: "ข้อมูลร้านค้า", icon: Store },
  { label: "ข้อมูลส่วนตัว", icon: UserRound },
  { label: "บัญชีธนาคาร", icon: Banknote },
  { label: "ที่อยู่", icon: MapPin },
];

const createInitialState = (displayName: string, shop: SellerShopSnapshot | null): SellerFormState => {
  const [firstName = "", ...restName] = displayName.split(" ").filter(Boolean);

  return {
    shopName: shop?.name ?? "",
    description: shop?.description ?? "",
    hasPhysicalStore: shop?.hasPhysicalStore ?? false,
    logoUrl: shop?.logoUrl ?? "",
    firstName: shop?.applicantFirstName ?? firstName,
    lastName: shop?.applicantLastName ?? restName.join(" "),
    phone: shop?.phone ?? "",
    bankName: shop?.bankName ?? "",
    bankBranch: shop?.bankBranch ?? "",
    bankAccountName: shop?.bankAccountName ?? displayName,
    bankAccountNumber: shop?.bankAccountNumber ?? "",
    bankBookImageUrl: shop?.bankBookImageUrl ?? "",
    addressLine: shop?.addressLine ?? "",
    subdistrict: shop?.subdistrict ?? "",
    district: shop?.district ?? "",
    province: shop?.province ?? "",
    postalCode: shop?.postalCode ?? "",
    acceptedTerms: false,
  };
};

const statusCopy: Record<ShopStatus, { title: string; description: string; tone: string }> = {
  PENDING: {
    title: "รอตรวจสอบโดยผู้ดูแลระบบ",
    description: "เราได้รับคำขอเปิดร้านแล้ว ผู้ดูแลจะตรวจเอกสาร เบอร์โทรศัพท์ และบัญชีธนาคารก่อนอนุมัติ",
    tone: "border-amber-400/40 bg-amber-400/10 text-amber-100",
  },
  APPROVED: {
    title: "ร้านค้าผ่านการอนุมัติแล้ว",
    description: "บัญชีนี้สามารถลงสินค้า เปิดประมูล และจัดการร้านค้าได้แล้ว",
    tone: "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
  },
  REJECTED: {
    title: "คำขอถูกปฏิเสธ",
    description: "ตรวจเหตุผลจากผู้ดูแล แล้วแก้ไขข้อมูลเพื่อส่งคำขอใหม่ได้",
    tone: "border-red-400/40 bg-red-400/10 text-red-100",
  },
  SUSPENDED: {
    title: "ร้านค้าถูกระงับ",
    description: "ติดต่อผู้ดูแลระบบเพื่อแก้ไขสถานะก่อนใช้งานร้านค้า",
    tone: "border-red-400/40 bg-red-400/10 text-red-100",
  },
};

const SellerApplicationWizard = ({ userEmail, displayName, initialShop }: SellerApplicationWizardProps) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SellerFormState>(() => createInitialState(displayName, initialShop));
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [devCode, setDevCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(Boolean(initialShop?.phoneVerifiedAt));
  const [busyAction, setBusyAction] = useState<"otp" | "verify" | "submit" | "upload-logo" | "upload-bank" | null>(null);

  const status = initialShop?.status;
  const isLocked = status === "PENDING" || status === "APPROVED" || status === "SUSPENDED";
  const copy = status ? statusCopy[status] : null;
  const canGoNext = step < steps.length - 1;

  const payload = useMemo(
    () => ({
      ...form,
      logoUrl: form.logoUrl || undefined,
      bankBookImageUrl: form.bankBookImageUrl || undefined,
    }),
    [form],
  );

  const updateField = <K extends keyof SellerFormState>(key: K, value: SellerFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "phone") {
      setPhoneVerified(false);
      setDevCode("");
    }
  };

  const sendOtp = async () => {
    setMessage("");
    setSuccessMessage("");
    setBusyAction("otp");

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "ส่งรหัส OTP ไม่สำเร็จ");
        return;
      }

      setDevCode(result.devCode ?? "");
      setSuccessMessage(result.devCode ? `ส่งรหัส OTP แล้ว รหัสทดสอบคือ ${result.devCode}` : "ส่งรหัส OTP แล้ว");
    } catch {
      setMessage("เชื่อมต่อระบบ OTP ไม่สำเร็จ");
    } finally {
      setBusyAction(null);
    }
  };

  const verifyOtp = async (code: string) => {
    setMessage("");
    setSuccessMessage("");
    setBusyAction("verify");

    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, code }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "ยืนยัน OTP ไม่สำเร็จ");
        return;
      }

      setPhoneVerified(true);
      setSuccessMessage("ยืนยันเบอร์โทรศัพท์สำเร็จ");
    } catch {
      setMessage("เชื่อมต่อระบบยืนยัน OTP ไม่สำเร็จ");
    } finally {
      setBusyAction(null);
    }
  };

  const uploadDocument = async (event: ChangeEvent<HTMLInputElement>, kind: "logo" | "bank-book") => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");
    setSuccessMessage("");
    setBusyAction(kind === "logo" ? "upload-logo" : "upload-bank");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      const response = await fetch("/api/uploads/seller-document", { method: "POST", body: formData });
      const result = (await response.json()) as ApiResponse & { url?: string };

      if (!response.ok || !result.ok || !result.url) {
        setMessage(result.message ?? "อัปโหลดไฟล์ไม่สำเร็จ");
        return;
      }

      if (kind === "logo") {
        updateField("logoUrl", result.url);
      } else {
        updateField("bankBookImageUrl", result.url);
      }
      setSuccessMessage("อัปโหลดไฟล์สำเร็จ");
    } catch {
      setMessage("เชื่อมต่อระบบอัปโหลดไม่สำเร็จ");
    } finally {
      setBusyAction(null);
      event.target.value = "";
    }
  };

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setSuccessMessage("");

    if (!phoneVerified) {
      setMessage("กรุณายืนยันเบอร์โทรศัพท์ด้วย OTP ก่อนส่งคำขอ");
      setStep(1);
      return;
    }

    const parsed = sellerApplicationSchema.safeParse(payload);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบข้อมูลให้ครบถ้วน");
      return;
    }

    setBusyAction("submit");

    try {
      const response = await fetch("/api/seller/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "ส่งคำขอเปิดร้านไม่สำเร็จ");
        return;
      }

      setSuccessMessage("ส่งคำขอเปิดร้านสำเร็จ กำลังรีเฟรชสถานะ");
      window.setTimeout(() => window.location.reload(), 700);
    } catch {
      setMessage("เชื่อมต่อระบบสมัครร้านค้าไม่สำเร็จ");
    } finally {
      setBusyAction(null);
    }
  };

  if (isLocked && initialShop && copy) {
    return (
      <Card className={cn("overflow-hidden border", copy.tone)}>
        <CardHeader>
          <div className="flex items-center gap-3">
            {status === "PENDING" ? <Clock3 className="size-6" /> : null}
            {status === "APPROVED" ? <CheckCircle2 className="size-6" /> : null}
            {status === "SUSPENDED" ? <XCircle className="size-6" /> : null}
            <div>
              <CardTitle>{copy.title}</CardTitle>
              <CardDescription className="text-current/75">{copy.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <InfoTile label="ชื่อร้าน" value={initialShop.name} />
            <InfoTile label="สถานะ" value={initialShop.status} />
            <InfoTile label="เบอร์โทร" value={initialShop.phone ?? "-"} />
          </div>
          {initialShop.rejectionReason ? <p className="rounded-xl bg-red-500/10 p-4 text-sm">เหตุผล: {initialShop.rejectionReason}</p> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={submitApplication} className="grid gap-6">
      {initialShop?.status === "REJECTED" ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
          <strong>คำขอเดิมถูกปฏิเสธ</strong>
          <p className="mt-1 text-red-100/80">{initialShop.rejectionReason ?? "กรุณาตรวจสอบข้อมูลและส่งคำขอใหม่"}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          {steps.map((item, index) => {
            const active = step === index;
            const done = step > index;
            return (
              <button
                key={item.label}
                type="button"
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                  active && "border-primary bg-primary/10 text-primary",
                  done && "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
                )}
                onClick={() => setStep(index)}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-background">
                  <item.icon className="size-4" />
                </span>
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[step].label}</CardTitle>
          <CardDescription>กรอกข้อมูลจริงให้ครบถ้วน ผู้ดูแลระบบจะใช้ข้อมูลนี้ในการตรวจอนุมัติร้านค้า</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {step === 0 ? (
            <>
              <Input placeholder="ชื่อร้านค้า" value={form.shopName} onChange={(event) => updateField("shopName", event.target.value)} />
              <textarea
                className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="รายละเอียดร้านค้า แนวสินค้า ช่องทางติดต่อ หรือจุดเด่นของร้าน"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
              <label className="flex items-center gap-3 rounded-xl border p-3 text-sm">
                <Checkbox checked={form.hasPhysicalStore} onCheckedChange={(checked) => updateField("hasPhysicalStore", checked === true)} />
                มีหน้าร้านจริง
              </label>
              <UploadBox
                label="อัปโหลดโลโก้ร้าน (ไม่บังคับ)"
                value={form.logoUrl}
                loading={busyAction === "upload-logo"}
                onChange={(event) => void uploadDocument(event, "logo")}
              />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input placeholder="ชื่อ" value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} />
                <Input placeholder="นามสกุล" value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} />
              </div>
              <Input disabled value={userEmail} />
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input placeholder="เบอร์โทรศัพท์ เช่น 0812345678" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
                <Button type="button" variant="outline" disabled={busyAction === "otp"} onClick={() => void sendOtp()}>
                  {busyAction === "otp" ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />}
                  ส่ง OTP
                </Button>
              </div>
              <OtpVerifyBox loading={busyAction === "verify"} verified={phoneVerified} devCode={devCode} onVerify={(code) => void verifyOtp(code)} />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input placeholder="ธนาคาร" value={form.bankName} onChange={(event) => updateField("bankName", event.target.value)} />
                <Input placeholder="สาขา" value={form.bankBranch} onChange={(event) => updateField("bankBranch", event.target.value)} />
              </div>
              <Input placeholder="ชื่อบัญชี" value={form.bankAccountName} onChange={(event) => updateField("bankAccountName", event.target.value)} />
              <Input
                inputMode="numeric"
                placeholder="เลขที่บัญชี"
                value={form.bankAccountNumber}
                onChange={(event) => updateField("bankAccountNumber", event.target.value)}
              />
              <UploadBox
                label="อัปโหลดสำเนาหน้าสมุดบัญชีธนาคาร (ไม่บังคับ)"
                value={form.bankBookImageUrl}
                loading={busyAction === "upload-bank"}
                onChange={(event) => void uploadDocument(event, "bank-book")}
              />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <textarea
                className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="บ้านเลขที่ อาคาร ถนน หรือรายละเอียดที่อยู่"
                value={form.addressLine}
                onChange={(event) => updateField("addressLine", event.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input placeholder="แขวง/ตำบล" value={form.subdistrict} onChange={(event) => updateField("subdistrict", event.target.value)} />
                <Input placeholder="เขต/อำเภอ" value={form.district} onChange={(event) => updateField("district", event.target.value)} />
                <Input placeholder="จังหวัด" value={form.province} onChange={(event) => updateField("province", event.target.value)} />
                <Input placeholder="รหัสไปรษณีย์" inputMode="numeric" value={form.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} />
              </div>
              <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
                <Checkbox checked={form.acceptedTerms} onCheckedChange={(checked) => updateField("acceptedTerms", checked === true)} />
                <span>ยืนยันว่าข้อมูลทั้งหมดเป็นจริง และยอมรับให้ผู้ดูแลตรวจสอบก่อนเปิดสิทธิ์ลงขายสินค้าและลงประมูล</span>
              </label>
            </>
          ) : null}

          {message ? <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{message}</p> : null}
          {successMessage ? <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{successMessage}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>
              ย้อนกลับ
            </Button>
            {canGoNext ? (
              <Button type="button" onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>
                ถัดไป
              </Button>
            ) : (
              <Button type="submit" disabled={busyAction === "submit"}>
                {busyAction === "submit" ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
                ส่งคำขอให้ผู้ดูแลอนุมัติ
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

const InfoTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-white/10 bg-background/50 p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 font-semibold">{value}</p>
  </div>
);

const UploadBox = ({
  label,
  value,
  loading,
  onChange,
}: {
  label: string;
  value: string;
  loading: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="rounded-xl border border-dashed p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">รองรับ JPG, PNG, WebP ขนาดไม่เกิน 5MB</p>
        {value ? <p className="mt-2 break-all text-xs text-emerald-300">{value}</p> : null}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
        เลือกไฟล์
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onChange} />
      </label>
    </div>
  </div>
);

const OtpVerifyBox = ({
  loading,
  verified,
  devCode,
  onVerify,
}: {
  loading: boolean;
  verified: boolean;
  devCode: string;
  onVerify: (code: string) => void;
}) => {
  const [code, setCode] = useState("");

  if (verified) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
        <CheckCircle2 className="size-4" />
        ยืนยันเบอร์โทรศัพท์แล้ว
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border p-3">
      {devCode ? <Badge className="w-fit bg-amber-500 text-black">Mock OTP: {devCode}</Badge> : null}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input inputMode="numeric" maxLength={6} placeholder="กรอกรหัส OTP 6 หลัก" value={code} onChange={(event) => setCode(event.target.value)} />
        <Button type="button" variant="outline" disabled={loading} onClick={() => onVerify(code)}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          ยืนยัน OTP
        </Button>
      </div>
    </div>
  );
};

export { SellerApplicationWizard };
export type { SellerShopSnapshot };
