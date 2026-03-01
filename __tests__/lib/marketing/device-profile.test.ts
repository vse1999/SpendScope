import {
  getDefaultIsMobileViewport,
  MARKETING_MOBILE_VIEWPORT_MAX_WIDTH,
} from "@/lib/marketing/device-profile";

describe("getDefaultIsMobileViewport", () => {
  it("returns true when sec-ch-ua-mobile explicitly indicates mobile", () => {
    const headersList = new Headers({
      "sec-ch-ua-mobile": "?1",
    });

    expect(getDefaultIsMobileViewport(headersList)).toBe(true);
  });

  it("returns false when sec-ch-ua-mobile explicitly indicates desktop", () => {
    const headersList = new Headers({
      "sec-ch-ua-mobile": "?0",
      "sec-ch-viewport-width": "375",
    });

    expect(getDefaultIsMobileViewport(headersList)).toBe(false);
  });

  it("uses sec-ch-viewport-width when the mobile client hint is unavailable", () => {
    const headersList = new Headers({
      "sec-ch-viewport-width": MARKETING_MOBILE_VIEWPORT_MAX_WIDTH.toString(),
    });

    expect(getDefaultIsMobileViewport(headersList)).toBe(true);
  });

  it("falls back to viewport-width when the higher priority hint is unavailable", () => {
    const headersList = new Headers({
      "viewport-width": "1024",
    });

    expect(getDefaultIsMobileViewport(headersList)).toBe(false);
  });

  it("returns false when no supported client hints are present", () => {
    expect(getDefaultIsMobileViewport(new Headers())).toBe(false);
  });
});
