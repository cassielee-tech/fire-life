export function toCostBasis(quantity: number, costPrice: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(costPrice)) return 0;
  return Math.round(quantity * costPrice * 1e6) / 1e6;
}

export function toCostPrice(costBasis: number, quantity: number): number | null {
  if (!Number.isFinite(costBasis) || !Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }
  return costBasis / quantity;
}
