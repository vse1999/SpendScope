jest.mock("next/font/google", () => ({
  Sora: () => ({ className: "font-display", variable: "--font-display" }),
}));

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { LandingPage } from "@/components/marketing/landing-page";

describe("LandingPage", () => {
  it("renders key marketing content into the server html", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain("Keep team spend visible before month-end turns into a surprise");
    expect(html).toContain("Create Free Workspace");
    expect(html).toContain("Choose your plan");
    expect(html).toContain("Frequently asked");
    expect(html).toContain("Ready to launch your");
    expect(html).toContain(
      '/signup?plan=free&amp;redirectTo=%2Fonboarding%3FredirectTo%3D%252Fdashboard'
    );
    expect(html).toContain(
      '/signup?plan=pro&amp;redirectTo=%2Fonboarding%3FredirectTo%3D%252Fdashboard%252Fbilling%26plan%3Dpro'
    );
  });
});
