jest.mock("next/font/google", () => ({
  Sora: () => ({ className: "font-display", variable: "--font-display" }),
}));

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { LandingPage } from "@/components/marketing/landing-page";

describe("LandingPage", () => {
  it("renders key marketing content into the server html", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain("Expense control");
    expect(html).toContain("Create Free Workspace");
    expect(html).toContain("Choose your plan");
    expect(html).toContain("Frequently asked");
    expect(html).toContain("Ready to launch your");
  });
});
