import type { ReactNode } from "react";
import { AccountNav } from "@/components/shared/AccountNav";
import { SimpleAppHeader } from "@/components/shared/SimpleAppHeader";

interface AccountLayoutProps {
  children: ReactNode;
}

const AccountLayout = ({ children }: AccountLayoutProps) => (
  <div className="min-h-screen bg-background text-foreground">
    <SimpleAppHeader />
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <AccountNav />
      <section className="min-w-0">{children}</section>
    </main>
  </div>
);

export default AccountLayout;
