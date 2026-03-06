import { ImageResponse } from "next/og";
import {
  getSocialImageTheme,
  resolveSocialImageVariant,
} from "@/lib/seo/social-preview";

export const runtime = "edge";

const TWITTER_IMAGE_SIZE = {
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
          background: `radial-gradient(circle at 18% 18%, ${theme.accentStart}33 0%, ${theme.backgroundStart} 38%, ${theme.backgroundEnd} 100%)`,
          color: "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          fontFamily: "ui-sans-serif, system-ui, Segoe UI, sans-serif",
          height: "100%",
          justifyContent: "center",
          padding: "68px 72px",
          width: "100%",
        }}
      >
        <div
          style={{
            color: "#38bdf8",
            display: "flex",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          {theme.badgeText}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 62,
            fontWeight: 800,
            lineHeight: 1.06,
            marginTop: 22,
            maxWidth: 980,
          }}
        >
          {theme.title}
        </div>
        <div
          style={{
            color: "#cbd5e1",
            display: "flex",
            fontSize: 28,
            marginTop: 24,
            maxWidth: 980,
          }}
        >
          {theme.description}
        </div>
      </div>
    ),
    TWITTER_IMAGE_SIZE
  );
}
