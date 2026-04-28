"use client";

import { useState } from "react";
import { Truck, WalletCards, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OrderActionsProps {
  orderId: string;
  canPay: boolean;
  canShip: boolean;
  canExtendShipping: boolean;
}

const OrderActions = ({ orderId, canPay, canShip, canExtendShipping }: OrderActionsProps) => {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitAction = async (action: "pay" | "ship" | "extend-shipping") => {
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/orders/${orderId}/action`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, trackingNumber: action === "ship" ? trackingNumber : undefined }),
      });
      const result = (await response.json()) as { ok: boolean; error?: { message: string } };

      if (!response.ok || !result.ok) {
        setMessage(result.error?.message ?? "ทำรายการไม่สำเร็จ");
        return;
      }

      setMessage("ทำรายการสำเร็จ กำลังรีเฟรชข้อมูล...");
      window.location.reload();
    } catch {
      setMessage("เชื่อมต่อระบบคำสั่งซื้อไม่ได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canPay && !canShip && !canExtendShipping) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canPay ? (
          <Button type="button" size="sm" disabled={isSubmitting} onClick={() => submitAction("pay")}>
            <WalletCards data-icon="inline-start" />
            ชำระเงิน
          </Button>
        ) : null}
        {canExtendShipping ? (
          <Button type="button" size="sm" variant="outline" disabled={isSubmitting} onClick={() => submitAction("extend-shipping")}>
            <TimerReset data-icon="inline-start" />
            ขยายส่ง 24 ชม.
          </Button>
        ) : null}
      </div>
      {canShip ? (
        <div className="flex max-w-md gap-2">
          <Input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="เลขพัสดุ" />
          <Button type="button" disabled={isSubmitting || trackingNumber.length < 3} onClick={() => submitAction("ship")}>
            <Truck data-icon="inline-start" />
            จัดส่ง
          </Button>
        </div>
      ) : null}
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
};

export { OrderActions };
