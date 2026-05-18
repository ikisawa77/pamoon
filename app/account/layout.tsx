import type { ReactNode } from "react";
import { AccountNav } from "@/components/shared/AccountNav";
import { AppFooter } from "@/components/shared/AppFooter";
import { SimpleAppHeader } from "@/components/shared/SimpleAppHeader";
import { getCurrentUser } from "@/lib/auth/current-user";

interface AccountLayoutProps {
  children: ReactNode;
}

const AccountLayout = async ({ children }: AccountLayoutProps) => {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SimpleAppHeader user={user} />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <AccountNav isAdmin={user?.role === "ADMIN"} isReseller={user?.role === "RESELLER" || user?.role === "ADMIN"} />
        <section className="min-w-0">{children}</section>
      </main>
      <AppFooter />
    </div>
  );
};

export default AccountLayout;
