"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { publicApiClient, unwrapResponse } from "@/lib/api/client";

export interface TenantThemeConfig {
  tenantId: string;
  brandName: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string | null;
  logoUrl: string | null;
}

interface ThemeContextValue {
  tenant: TenantThemeConfig | null;
  isLoading: boolean;
}

const defaultPrimary = "#1B3A6B";
const defaultAccent = "#0EA5E9";
const defaultFont = "Inter, sans-serif";

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const applyTheme = (tenant: TenantThemeConfig | null): void => {
  if (typeof document === "undefined") return;

  document.documentElement.style.setProperty("--color-primary", tenant?.primaryColor ?? defaultPrimary);
  document.documentElement.style.setProperty("--color-accent", tenant?.accentColor ?? defaultAccent);
  document.documentElement.style.setProperty("--font-family", tenant?.fontFamily ?? defaultFont);
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [tenant, setTenant] = useState<TenantThemeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadTenantTheme = async () => {
      try {
        const host = typeof window !== "undefined" ? window.location.hostname : "";
        const search = typeof window !== "undefined" ? window.location.search : "";
        const params = new URLSearchParams(search);
        const isPreview = params.get("preview") === "true";

        if (isPreview) {
          const previewTenant: TenantThemeConfig = {
            tenantId: "preview",
            brandName: params.get("brand") ?? "CampusHire",
            primaryColor: params.get("primaryColor") ?? defaultPrimary,
            accentColor: params.get("accentColor") ?? defaultAccent,
            fontFamily: params.get("font") ?? defaultFont,
            logoUrl: params.get("logo")
          };
          applyTheme(previewTenant);
          if (active) {
            setTenant(previewTenant);
            setIsLoading(false);
          }
          return;
        }

        const isTenantHost = host.endsWith("campushire.in") && host.split(".").length > 2;

        if (!isTenantHost) {
          applyTheme(null);
          if (active) {
            setTenant(null);
            setIsLoading(false);
          }
          return;
        }

        const response = await publicApiClient.get("/api/whitelabel/config");
        const config = unwrapResponse<{
          tenantId: string;
          brandName: string;
          primaryColor: string;
          accentColor: string;
          fontFamily: string | null;
          logoUrl: string | null;
        }>(response);

        if (!active) return;

        const nextTenant: TenantThemeConfig = {
          tenantId: config.tenantId,
          brandName: config.brandName,
          primaryColor: config.primaryColor,
          accentColor: config.accentColor,
          fontFamily: config.fontFamily,
          logoUrl: config.logoUrl
        };

        setTenant(nextTenant);
        applyTheme(nextTenant);
      } catch {
        if (active) {
          setTenant(null);
          applyTheme(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadTenantTheme();

    return () => {
      active = false;
    };
  }, []);

  const contextValue = useMemo(() => ({ tenant, isLoading }), [tenant, isLoading]);

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};
