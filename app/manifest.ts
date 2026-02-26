import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SpendScope",
    short_name: "SpendScope",
    description:
      "Track spending, enforce controls, and monitor analytics with policy-aware insights built for modern teams.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: "/favico/favicon-48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/favico/favicon-256.png",
        sizes: "256x256",
        type: "image/png",
      },
    ],
  };
}
