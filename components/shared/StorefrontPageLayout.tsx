import type { ReactNode } from "react";
import { SimpleAppHeader } from "@/components/shared/SimpleAppHeader";

interface StorefrontPageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

const StorefrontPageLayout = ({ title, description, children }: StorefrontPageLayoutProps) => (
  <div className="min-h-screen bg-background text-foreground">
    <SimpleAppHeader />
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </section>
      {children}
    </main>
  </div>
);

export { StorefrontPageLayout };
