interface AmountLike {
  readonly amount: number;
}

export function getTotalAmount(items: readonly AmountLike[]): number {
  return items.reduce((total, item) => total + item.amount, 0);
}

export function formatSharePercentage(amount: number, total: number): string {
  if (total <= 0) {
    return "0%";
  }

  return `${Math.round((amount / total) * 100)}%`;
}
