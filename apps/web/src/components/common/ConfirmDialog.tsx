"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  onConfirm,
  onCancel,
  children
}: ConfirmDialogProps) => {
  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-bold text-slate-900">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-slate-600">{description}</Dialog.Description>
          {children ? <div className="mt-4">{children}</div> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button variant={confirmVariant === "destructive" ? "destructive" : "default"} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
