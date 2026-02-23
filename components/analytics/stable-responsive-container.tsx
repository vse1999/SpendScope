"use client"

import type { ReactNode } from "react"
import { ResponsiveContainer } from "recharts"

const STABLE_INITIAL_DIMENSION: { width: number; height: number } = {
  width: 1,
  height: 1,
}

interface StableResponsiveContainerProps {
  children: ReactNode
}

export function StableResponsiveContainer({
  children,
}: StableResponsiveContainerProps): React.JSX.Element {
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={1}
      minHeight={1}
      initialDimension={STABLE_INITIAL_DIMENSION}
    >
      {children}
    </ResponsiveContainer>
  )
}
