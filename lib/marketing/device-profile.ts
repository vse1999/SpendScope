export const MARKETING_MOBILE_VIEWPORT_MAX_WIDTH = 767;

function parseViewportWidthHeaderValue(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

export function getDefaultIsMobileViewport(
  headersList: Pick<Headers, "get">
): boolean {
  const mobileClientHint = headersList.get("sec-ch-ua-mobile");
  if (mobileClientHint === "?1") {
    return true;
  }

  if (mobileClientHint === "?0") {
    return false;
  }

  const viewportWidth =
    parseViewportWidthHeaderValue(headersList.get("sec-ch-viewport-width")) ??
    parseViewportWidthHeaderValue(headersList.get("viewport-width"));

  if (viewportWidth === null) {
    return false;
  }

  return viewportWidth <= MARKETING_MOBILE_VIEWPORT_MAX_WIDTH;
}
