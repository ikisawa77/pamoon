"use client";

import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Gavel, Info, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ConfirmTone = "default" | "destructive" | "warning" | "success" | "bid";

interface ConfirmDetail {
  label: string;
  value: string;
}

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  details?: ConfirmDetail[];
  icon?: ReactNode;
}

interface AppConfirmDialogProps extends Required<Pick<ConfirmOptions, "title" | "description">> {
  open: boolean;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmTone;
  details?: ConfirmDetail[];
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  onOpenChange: (open: boolean) => void;
}

const toneConfig: Record<ConfirmTone, { icon: ReactNode; ring: string; button: "default" | "destructive" }> = {
  default: {
    icon: <Info className="size-5" />,
    ring: "bg-slate-950 text-white shadow-slate-950/20",
    button: "default",
  },
  destructive: {
    icon: <ShieldAlert className="size-5" />,
    ring: "bg-destructive text-white shadow-destructive/20",
    button: "destructive",
  },
  warning: {
    icon: <AlertTriangle className="size-5" />,
    ring: "bg-amber-500 text-white shadow-amber-500/20",
    button: "default",
  },
  success: {
    icon: <CheckCircle2 className="size-5" />,
    ring: "bg-emerald-600 text-white shadow-emerald-600/20",
    button: "default",
  },
  bid: {
    icon: <Gavel className="size-5" />,
    ring: "bg-primary text-primary-foreground shadow-primary/20",
    button: "default",
  },
};

const AppConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone,
  details,
  icon,
  onConfirm,
  onCancel,
  onOpenChange,
}: AppConfirmDialogProps) => {
  const config = toneConfig[tone];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md" showCloseButton={false}>
        <div className="flex flex-col gap-5 p-6">
          <DialogHeader className="gap-4 text-left">
            <div className="flex items-start gap-4">
              <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-lg", config.ring)}>
                {icon ?? config.icon}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-bold leading-7">{title}</DialogTitle>
                <DialogDescription className="mt-2 leading-6">{description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {details && details.length > 0 ? (
            <div className="rounded-2xl border bg-muted/40 p-4">
              <div className="grid gap-3">
                {details.map((detail) => (
                  <div key={detail.label} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{detail.label}</span>
                    <strong className="text-right font-semibold">{detail.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button type="button" variant={config.button} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AppStatusDialog = ({
  open,
  title,
  description,
  tone = "success",
  actionLabel = "รับทราบ",
  onOpenChange,
}: {
  open: boolean;
  title: string;
  description: string;
  tone?: Exclude<ConfirmTone, "bid">;
  actionLabel?: string;
  onOpenChange: (open: boolean) => void;
}) => {
  const config = toneConfig[tone];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md" showCloseButton={false}>
        <div className="flex flex-col gap-5 p-6">
          <DialogHeader className="gap-4 text-left">
            <div className="flex items-start gap-4">
              <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-lg", config.ring)}>
                {config.icon}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-bold leading-7">{title}</DialogTitle>
                <DialogDescription className="mt-2 leading-6">{description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              {actionLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const useAppConfirmDialog = () => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const close = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((nextOptions: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(nextOptions);
    });
  }, []);

  const confirmDialog = options ? (
    <AppConfirmDialog
      open={Boolean(options)}
      title={options.title}
      description={options.description}
      confirmLabel={options.confirmLabel ?? "ยืนยัน"}
      cancelLabel={options.cancelLabel ?? "ยกเลิก"}
      tone={options.tone ?? "default"}
      details={options.details}
      icon={options.icon}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
      onOpenChange={(open) => {
        if (!open) {
          close(false);
        }
      }}
    />
  ) : null;

  return { confirm, confirmDialog };
};

export { AppConfirmDialog, AppStatusDialog, useAppConfirmDialog };
export type { ConfirmOptions };
