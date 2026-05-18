import Link from "next/link";
import { Mail, ShieldCheck, Store, Trophy } from "lucide-react";

const AppFooter = () => (
  <footer className="mt-12 border-t border-white/10 bg-[#060914] px-4 py-10 text-white">
    <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[minmax(0,1fr)_180px_180px_240px]">
      <section>
        <div className="flex items-center gap-3">
          <div className="flex size-10 rotate-[-8deg] items-center justify-center rounded-lg bg-primary text-primary-foreground">★</div>
          <strong className="text-2xl">BidCard TH</strong>
        </div>
        <p className="mt-4 max-w-md text-sm leading-7 text-white/65">
          ตลาดประมูลและซื้อขายการ์ดแบบ immersive marketplace รวมร้านค้า สมาชิก กระเป๋าเงิน แจ้งเตือน realtime และ SLA ไว้ในระบบเดียว
        </p>
      </section>

      <nav className="grid gap-2 text-sm text-white/75">
        <strong className="mb-2 text-white">ตลาดการ์ด</strong>
        <Link href="/auctions">ประมูล</Link>
        <Link href="/buy-now">ซื้อเลย</Link>
        <Link href="/shops">ร้านค้า</Link>
        <Link href="/collection">รายการโปรด</Link>
      </nav>

      <nav className="grid gap-2 text-sm text-white/75">
        <strong className="mb-2 text-white">บัญชี</strong>
        <Link href="/account">บัญชีของฉัน</Link>
        <Link href="/wallet">เติมเงิน</Link>
        <Link href="/seller/register">สมัคร Reseller</Link>
        <Link href="/help">ช่วยเหลือ</Link>
      </nav>

      <section className="grid gap-3 text-sm text-white/75">
        <strong className="text-white">ระบบพร้อมใช้งาน</strong>
        <span className="inline-flex items-center gap-2"><Trophy className="size-4 text-primary" /> ประมูลต่อเวลาอัตโนมัติ</span>
        <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Escrow และ SLA</span>
        <span className="inline-flex items-center gap-2"><Mail className="size-4 text-primary" /> แจ้งเตือนอีเมล</span>
        <span className="inline-flex items-center gap-2"><Store className="size-4 text-primary" /> ร้านค้าที่ตรวจสอบแล้ว</span>
      </section>
    </div>
  </footer>
);

export { AppFooter };
