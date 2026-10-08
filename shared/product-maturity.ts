export const PRODUCT_CYCLE_DAY_MS = 24 * 60 * 60 * 1000;

export interface ProductMaturityInfo {
  maturityAt: Date | null;
  isMatured: boolean;
  daysRemaining: number;
  elapsedCycles: number;
}

export function getProductMaturityInfo(
  purchasedAt: Date | string,
  durationDays: number,
  now = new Date(),
): ProductMaturityInfo {
  const purchasedAtMs =
    purchasedAt instanceof Date
      ? purchasedAt.getTime()
      : new Date(purchasedAt).getTime();
  const duration = Number(durationDays);
  const nowMs = now.getTime();

  if (
    !Number.isFinite(purchasedAtMs) ||
    !Number.isInteger(duration) ||
    duration <= 0 ||
    !Number.isFinite(nowMs)
  ) {
    return {
      maturityAt: null,
      isMatured: false,
      daysRemaining: 0,
      elapsedCycles: 0,
    };
  }

  const maturityAtMs = purchasedAtMs + duration * PRODUCT_CYCLE_DAY_MS;
  const elapsedCycles = Math.max(
    0,
    Math.min(duration, Math.floor((nowMs - purchasedAtMs) / PRODUCT_CYCLE_DAY_MS)),
  );

  return {
    maturityAt: new Date(maturityAtMs),
    isMatured: nowMs >= maturityAtMs,
    daysRemaining: Math.max(
      0,
      Math.ceil((maturityAtMs - nowMs) / PRODUCT_CYCLE_DAY_MS),
    ),
    elapsedCycles,
  };
}
