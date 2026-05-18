import type { ReactNode } from "react";
import { AppFooter } from "@/components/shared/AppFooter";
import { SimpleAppHeader } from "@/components/shared/SimpleAppHeader";
import { getCurrentUser } from "@/lib/auth/current-user";

interface StorefrontPageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

const StorefrontPageLayout = async ({ title, description, children }: StorefrontPageLayoutProps) => {
  const user = await getCurrentUser();

  return (
    <div className="retro-shell min-h-screen text-foreground">
      <SimpleAppHeader user={user} />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        <section className="neon-panel flex flex-col gap-2 p-6">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-ring">BidCard TH</span>
          <h1 className="text-3xl font-black md:text-4xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        </section>
        {children}
      </main>
      <AppFooter />
    </div>
  );
};

export { StorefrontPageLayout };
