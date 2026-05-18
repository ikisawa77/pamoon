import Link from "next/link";
import { ArrowLeft, BadgeCheck, Gavel, ShieldCheck, Store, WalletCards } from "lucide-react";
import { AppFooter } from "@/components/shared/AppFooter";
import { SimpleAppHeader } from "@/components/shared/SimpleAppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const featureItems = [
  { icon: Gavel, label: "ประมูลสด", detail: "บิดแบบ realtime พร้อมแจ้งเตือนในระบบ" },
  { icon: WalletCards, label: "Wallet + Escrow", detail: "กันเงินก่อนจ่ายร้านค้าเมื่อรายการสำเร็จ" },
  { icon: Store, label: "Reseller", detail: "ลงขายและเปิดประมูลได้ทันทีหลังสมัคร" },
  { icon: ShieldCheck, label: "Admin Control", detail: "ดูแลร้านค้า คำสั่งซื้อ แจ้งเตือน และ SLA" },
];

const AuthShell = ({ title, description, children }: AuthShellProps) => (
  <div className="retro-shell min-h-screen overflow-hidden text-foreground">
    <SimpleAppHeader user={null} />
    <main className="mx-auto grid min-h-[calc(100svh-70px)] max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden px-10 py-10 text-white lg:flex">
        <div className="absolute inset-0 opacity-80">
          <div className="product-art object-pos-2 h-full w-full scale-110 opacity-20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(225,29,72,.55),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(0,217,255,.32),transparent_28%),linear-gradient(135deg,rgba(2,6,23,.68),#020617_72%)]" />
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-11 rotate-[-8deg] items-center justify-center rounded-xl bg-primary text-lg font-bold shadow-2xl shadow-primary/30">
              ★
            </span>
            <span className="text-2xl font-bold">BidCard TH</span>
          </Link>
          <Badge className="border-white/15 bg-white/10 text-white">Retro Market OS</Badge>
        </div>

        <div className="relative z-10 max-w-xl pb-10">
          <Badge className="mb-5 border-white/15 bg-white/10 text-white">Marketplace Command</Badge>
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight">
            ระบบสมาชิก ร้านค้า และหลังบ้านใน flow เดียว
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-white/72">
            Member สำหรับซื้อและประมูล, Reseller สำหรับลงขาย และ Admin สำหรับดูแลระบบทั้งหมด
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {featureItems.map((item) => (
              <div key={item.label} className="neon-panel rounded-2xl p-4">
                <item.icon className="mb-3 size-5 text-cyan-200" />
                <p className="font-semibold">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-white/60">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12">
        <div className="mb-8 flex items-center justify-between">
          <Button asChild variant="ghost" className="px-0 text-muted-foreground">
            <Link href="/">
              <ArrowLeft data-icon="inline-start" />
              กลับหน้าแรก
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BadgeCheck className="size-4 text-primary" />
            Secure Access
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="neon-panel w-full max-w-[560px] rounded-[28px] p-6 sm:p-8">
            <div className="mb-7">
              <Badge className="mb-4 bg-primary text-white">BidCard TH Account</Badge>
              <h2 className="text-4xl font-bold tracking-tight">{title}</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
            </div>
            {children}
          </div>
        </div>
      </section>
    </main>
    <AppFooter />
  </div>
);

export { AuthShell };
