"use client";

import * as React from "react";

import { MARKETING_MOBILE_VIEWPORT_MAX_WIDTH } from "@/lib/marketing/device-profile";

export interface MarketingDeviceProfile {
  readonly isMobileViewport: boolean;
  readonly useMobileOptimizedContent: boolean;
  readonly prefersReducedMotion: boolean;
  readonly isCoarsePointer: boolean;
  readonly saveData: boolean;
  readonly allowEnhancedMotion: boolean;
}

interface MarketingDeviceProfileProviderProps {
  readonly children: React.ReactNode;
  readonly defaultIsMobileViewport?: boolean;
}

interface ConnectionLike {
  readonly saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
}

interface NavigatorWithConnection extends Navigator {
  readonly connection?: ConnectionLike;
}

const DEFAULT_MARKETING_DEVICE_PROFILE: MarketingDeviceProfile = {
  isMobileViewport: false,
  useMobileOptimizedContent: false,
  prefersReducedMotion: false,
  isCoarsePointer: false,
  saveData: false,
  allowEnhancedMotion: false,
};

const MOBILE_VIEWPORT_MEDIA_QUERY = `(max-width: ${MARKETING_MOBILE_VIEWPORT_MAX_WIDTH}px)`;

const MarketingDeviceProfileContext =
  React.createContext<MarketingDeviceProfile>(DEFAULT_MARKETING_DEVICE_PROFILE);

function subscribeToMediaQuery(
  query: string,
  onStoreChange: () => void
): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }

  const mediaQueryList = window.matchMedia(query);
  const handleChange = (): void => {
    onStoreChange();
  };

  mediaQueryList.addEventListener("change", handleChange);

  return (): void => {
    mediaQueryList.removeEventListener("change", handleChange);
  };
}

function getMediaQuerySnapshot(query: string, fallback: boolean): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return fallback;
  }

  return window.matchMedia(query).matches;
}

function useMediaQuery(query: string, fallback: boolean): boolean {
  return React.useSyncExternalStore(
    (onStoreChange) => subscribeToMediaQuery(query, onStoreChange),
    () => getMediaQuerySnapshot(query, fallback),
    () => fallback
  );
}

function getNavigatorConnection(): ConnectionLike | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  return (navigator as NavigatorWithConnection).connection;
}

function subscribeToSaveData(onStoreChange: () => void): () => void {
  const connection = getNavigatorConnection();
  if (!connection?.addEventListener || !connection.removeEventListener) {
    return () => undefined;
  }

  connection.addEventListener("change", onStoreChange);

  return (): void => {
    connection.removeEventListener?.("change", onStoreChange);
  };
}

function getSaveDataSnapshot(): boolean {
  return getNavigatorConnection()?.saveData === true;
}

function useSaveDataPreference(): boolean {
  return React.useSyncExternalStore(
    subscribeToSaveData,
    getSaveDataSnapshot,
    () => false
  );
}

export function MarketingDeviceProfileProvider({
  children,
  defaultIsMobileViewport = false,
}: MarketingDeviceProfileProviderProps): React.JSX.Element {
  const isMobileViewport = useMediaQuery(
    MOBILE_VIEWPORT_MEDIA_QUERY,
    defaultIsMobileViewport
  );
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
    false
  );
  const isCoarsePointer = useMediaQuery(
    "(pointer: coarse)",
    defaultIsMobileViewport
  );
  const saveData = useSaveDataPreference();
  const contextValue = React.useMemo<MarketingDeviceProfile>(
    () => ({
      isMobileViewport,
      useMobileOptimizedContent: isMobileViewport,
      prefersReducedMotion,
      isCoarsePointer,
      saveData,
      allowEnhancedMotion:
        !isMobileViewport && !prefersReducedMotion && !isCoarsePointer && !saveData,
    }),
    [isCoarsePointer, isMobileViewport, prefersReducedMotion, saveData]
  );

  return (
    <MarketingDeviceProfileContext.Provider value={contextValue}>
      {children}
    </MarketingDeviceProfileContext.Provider>
  );
}

export function useMarketingDeviceProfile(): MarketingDeviceProfile {
  return React.useContext(MarketingDeviceProfileContext);
}
