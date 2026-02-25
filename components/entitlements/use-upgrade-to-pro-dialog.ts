"use client";

import { useCallback, useState } from "react";

import type { UpgradeDialogContext } from "./types";

interface UseUpgradeToProDialogResult {
  open: boolean;
  context: UpgradeDialogContext | null;
  openUpgradeDialog: (nextContext: UpgradeDialogContext) => void;
  onOpenChange: (nextOpen: boolean) => void;
}

export function useUpgradeToProDialog(): UseUpgradeToProDialogResult {
  const [open, setOpen] = useState<boolean>(false);
  const [context, setContext] = useState<UpgradeDialogContext | null>(null);

  const openUpgradeDialog = useCallback((nextContext: UpgradeDialogContext): void => {
    setContext(nextContext);
    setOpen(true);
  }, []);

  const onOpenChange = useCallback((nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setContext(null);
    }
  }, []);

  return {
    open,
    context,
    openUpgradeDialog,
    onOpenChange,
  };
}
