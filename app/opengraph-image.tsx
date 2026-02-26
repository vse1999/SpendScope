import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "radial-gradient(circle at 20% 20%, #1e40af 0%, #0f172a 55%, #020617 100%)",
          color: "#e2e8f0",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 2, opacity: 0.85 }}>
          SpendScope
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.05,
            maxWidth: 900,
          }}
        >
          Enterprise Expense Analytics
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 32,
            opacity: 0.9,
            maxWidth: 950,
          }}
        >
          Track spending, enforce controls, and monitor analytics with policy-aware insights.
        </div>
      </div>
    ),
    size
  );
}
