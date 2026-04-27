"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <Button type="button" variant="outline" onClick={handleLogout}>
      <LogOut data-icon="inline-start" />
      ออกจากระบบ
    </Button>
  );
};

export { LogoutButton };
