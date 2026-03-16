const ANALYTICS_DAY_PRESET_VALUES = [30, 90, 180, 365] as const

export const ANALYTICS_DAY_PRESET_OPTIONS = ANALYTICS_DAY_PRESET_VALUES.map((value) => ({
  label: `Last ${value} days`,
  value,
}))

export const DEFAULT_ANALYTICS_DAYS = 90

type AnalyticsDayParam = string | string[] | number | null | undefined

function normalizeAnalyticsDayInput(value: AnalyticsDayParam): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }

  if (typeof value === "number") {
    return String(value)
  }

  return value ?? undefined
}

function toUtcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addUtcDays(date: Date, dayDelta: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + dayDelta)
  )
}

export function parseAnalyticsDaysParam(
  value: AnalyticsDayParam,
  fallback: number = DEFAULT_ANALYTICS_DAYS
): number {
  const normalizedValue = normalizeAnalyticsDayInput(value)
  const parsedDays = Number(normalizedValue)

  return ANALYTICS_DAY_PRESET_VALUES.includes(
    parsedDays as (typeof ANALYTICS_DAY_PRESET_VALUES)[number]
  )
    ? parsedDays
    : fallback
}

export function getAnalyticsPeriodBounds(
  days: number,
  now: Date = new Date()
): {
  startDate: Date
  endDate: Date
  endExclusive: Date
} {
  const endExclusive = addUtcDays(toUtcDayStart(now), 1)
  const startDate = addUtcDays(toUtcDayStart(now), -(days - 1))
  const endDate = new Date(endExclusive.getTime() - 1)

  return {
    startDate,
    endDate,
    endExclusive,
  }
}
