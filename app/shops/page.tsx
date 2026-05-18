import Image from "next/image";
import Link from "next/link";
import { Package, Star, Store, Trophy, type LucideIcon } from "lucide-react";
import { AppFooter } from "@/components/shared/AppFooter";
import { SimpleAppHeader } from "@/components/shared/SimpleAppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getViewerSummary } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const statusLabel = {
  APPROVED: "เปิดขายอยู่",
  PENDING: "รอตรวจสอบ",
  REJECTED: "ไม่อนุมัติ",
  SUSPENDED: "ระงับชั่วคราว",
} as const;

const ShopsPage = async () => {
  const viewer = await getViewerSummary();
  const shops = await prisma.shop.findMany({
    where: { status: "APPROVED" },
    orderBy: [{ rating: "desc" }, { reviewCount: "desc" }, { createdAt: "desc" }],
    include: {
      owner: { select: { displayName: true } },
      products: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          title: true,
          imageUrl: true,
          mode: true,
          rarity: true,
        },
      },
      _count: { select: { products: true, orders: true } },
    },
  });

  return (
    <div className="retro-shell min-h-screen text-foreground">
      <SimpleAppHeader user={viewer} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="neon-panel grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <Badge className="mb-4">Verified Resellers</Badge>
            <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">ร้านการ์ดที่ผ่านการตรวจสอบ</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              เลือกร้านค้า ดูคะแนน รีวิว จำนวนสินค้า และรายการล่าสุดก่อนซื้อหรือเข้าร่วมประมูล
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric icon={Store} label="ร้านค้า" value={shops.length.toLocaleString("th-TH")} />
            <Metric icon={Package} label="สินค้า" value={shops.reduce((sum, shop) => sum + shop._count.products, 0).toLocaleString("th-TH")} />
            <Metric icon={Trophy} label="คำสั่งซื้อ" value={shops.reduce((sum, shop) => sum + shop._count.orders, 0).toLocaleString("th-TH")} />
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {shops.map((shop) => (
            <article key={shop.id} className="neon-panel overflow-hidden rounded-2xl transition hover:-translate-y-1">
              <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="min-w-0">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge>{statusLabel[shop.status]}</Badge>
                      <h2 className="mt-3 truncate text-2xl font-bold">{shop.name}</h2>
                      <p className="text-sm text-muted-foreground">ดูแลโดย {shop.owner.displayName}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-primary">
                        <Star className="size-4 fill-current" />
                        {shop.rating.toFixed(1)}
                      </span>
                      <p className="text-xs text-muted-foreground">{shop.reviewCount.toLocaleString("th-TH")} รีวิว</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="rounded-xl bg-white/5 p-3"><strong className="block text-lg">{shop._count.products}</strong>สินค้า</span>
                    <span className="rounded-xl bg-white/5 p-3"><strong className="block text-lg">{shop._count.orders}</strong>คำสั่งซื้อ</span>
                    <span className="rounded-xl bg-white/5 p-3"><strong className="block truncate text-lg">{shop.slug}</strong>รหัสร้าน</span>
                  </div>
                  <Button asChild className="mt-5">
                    <Link href={`/shops/${shop.slug}`}>เปิดหน้าร้าน</Link>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {shop.products.length > 0 ? (
                    shop.products.map((product) => (
                      <Link
                        key={product.id}
                        href={product.mode === "AUCTION" ? `/auctions/${product.id}` : `/buy-now/${product.id}`}
                        className="product-art relative aspect-[100/140] overflow-hidden rounded-xl bg-white/5"
                      >
                        {product.imageUrl ? <Image src={product.imageUrl} alt={product.title} fill sizes="110px" className="object-cover" /> : null}
                        <Badge className="absolute bottom-2 left-2 text-[10px]" variant={product.mode === "AUCTION" ? "default" : "secondary"}>
                          {product.rarity}
                        </Badge>
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-2 flex min-h-52 items-center justify-center rounded-xl bg-white/5 text-sm text-muted-foreground">ยังไม่มีสินค้าที่เปิดขาย</div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
      <AppFooter />
    </div>
  );
};

interface MetricProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

const Metric = ({ icon: Icon, label, value }: MetricProps) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <Icon className="mb-3 text-primary" />
    <strong className="block text-2xl">{value}</strong>
    <span className="text-sm text-muted-foreground">{label}</span>
  </div>
);

export default ShopsPage;


