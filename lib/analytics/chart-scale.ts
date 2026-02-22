const MIN_Y_AXIS_MAX = 100;
const Y_AXIS_HEADROOM_RATIO = 1.2;
const NICE_STEP_FACTORS = [1, 2, 2.5, 5, 10] as const;

const currencyIntegerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function getNiceStepFactor(normalized: number): number {
  for (const factor of NICE_STEP_FACTORS) {
    if (normalized <= factor) {
      return factor;
    }
  }
  return NICE_STEP_FACTORS[NICE_STEP_FACTORS.length - 1];
}

export function computeYAxisMax(amounts: number[]): number {
  if (amounts.length === 0) {
    return MIN_Y_AXIS_MAX;
  }

  const maxAmount = Math.max(...amounts);
  if (maxAmount <= 0) {
    return MIN_Y_AXIS_MAX;
  }

  const paddedMax = maxAmount * Y_AXIS_HEADROOM_RATIO;
  const magnitude = 10 ** Math.floor(Math.log10(paddedMax));
  const normalized = paddedMax / magnitude;
  const factor = getNiceStepFactor(normalized);
  const roundedMax = factor * magnitude;

  return Math.max(MIN_Y_AXIS_MAX, roundedMax);
}

export function buildYAxisTicks(yAxisMax: number, tickCount: number = 6): number[] {
  const safeTickCount = Number.isFinite(tickCount) ? Math.max(2, Math.floor(tickCount)) : 5;
  const safeMax = Number.isFinite(yAxisMax) && yAxisMax > 0 ? yAxisMax : MIN_Y_AXIS_MAX;
  const step = safeMax / (safeTickCount - 1);

  return Array.from({ length: safeTickCount }, (_, index) => Math.round(step * index));
}

export function formatAxisCurrencyTick(value: number): string {
  return `$${currencyIntegerFormatter.format(value)}`;
}
