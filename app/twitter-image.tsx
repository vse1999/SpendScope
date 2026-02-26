import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "radial-gradient(circle at 80% 20%, #2563eb 0%, #1e293b 55%, #020617 100%)",
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
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.08,
            maxWidth: 920,
          }}
        >
          Modern Expense Intelligence for Teams
        </div>
      </div>
    ),
    size
  );
}
