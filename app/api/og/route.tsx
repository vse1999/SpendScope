import { ImageResponse } from "next/og";
import {
  getSocialImageTheme,
  resolveSocialImageVariant,
} from "@/lib/seo/social-preview";

export const runtime = "edge";

const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

export function GET(request: Request): ImageResponse {
  const { searchParams } = new URL(request.url);
  const variant = resolveSocialImageVariant(searchParams.get("variant"));
  const theme = getSocialImageTheme(variant);

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "flex-start",
          background: `linear-gradient(135deg, ${theme.backgroundStart} 0%, ${theme.backgroundEnd} 100%)`,
          color: "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          fontFamily: "ui-sans-serif, system-ui, Segoe UI, sans-serif",
          height: "100%",
          justifyContent: "center",
          padding: "64px 72px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: `linear-gradient(90deg, ${theme.accentStart} 0%, ${theme.accentEnd} 100%)`,
            borderRadius: 9999,
            color: "#020617",
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 0.4,
            padding: "10px 22px",
          }}
        >
          {theme.badgeText}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.04,
            marginTop: 28,
            maxWidth: 980,
          }}
        >
          {theme.title}
        </div>
        <div
          style={{
            color: "#cbd5e1",
            display: "flex",
            fontSize: 30,
            lineHeight: 1.25,
            marginTop: 26,
            maxWidth: 980,
          }}
        >
          {theme.description}
        </div>
        <div
          style={{
            bottom: 52,
            color: "#94a3b8",
            display: "flex",
            fontSize: 22,
            letterSpacing: 0.3,
            position: "absolute",
            right: 72,
          }}
        >
          spendscope.app
        </div>
      </div>
    ),
    OG_IMAGE_SIZE
  );
}
