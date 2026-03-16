"use client"

import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react"

interface MarketingScrollLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  readonly href: `#${string}`
}

function getScrollBehavior(): ScrollBehavior {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return "auto"
  }

  return "smooth"
}

export const MarketingScrollLink = forwardRef<
  HTMLAnchorElement,
  MarketingScrollLinkProps
>(function MarketingScrollLink({ href, onClick, ...props }, ref) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    onClick?.(event)

    if (event.defaultPrevented || typeof document === "undefined") {
      return
    }

    const targetId = href.slice(1)
    const targetElement = document.getElementById(targetId)

    if (!targetElement) {
      return
    }

    event.preventDefault()
    targetElement.scrollIntoView({
      behavior: getScrollBehavior(),
      block: "start",
    })
    window.history.replaceState(window.history.state, "", href)
  }

  return <a {...props} ref={ref} href={href} onClick={handleClick} />
})
