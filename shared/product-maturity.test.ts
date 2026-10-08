import assert from "node:assert/strict";
import test from "node:test";
import { getProductMaturityInfo, PRODUCT_CYCLE_DAY_MS } from "./product-maturity";

const purchasedAt = new Date("2026-10-05T05:00:00.000Z");

test("a product becomes collectible at the exact end of its duration", () => {
  const maturityAt = new Date(
    purchasedAt.getTime() + 2 * PRODUCT_CYCLE_DAY_MS,
  );

  const justBefore = getProductMaturityInfo(
    purchasedAt,
    2,
    new Date(maturityAt.getTime() - 1),
  );
  const atMaturity = getProductMaturityInfo(purchasedAt, 2, maturityAt);

  assert.equal(justBefore.isMatured, false);
  assert.equal(justBefore.daysRemaining, 1);
  assert.equal(atMaturity.isMatured, true);
  assert.equal(atMaturity.daysRemaining, 0);
  assert.equal(atMaturity.elapsedCycles, 2);
});

test("maturity is calculated from purchase time when scheduled cycle updates were missed", () => {
  const info = getProductMaturityInfo(
    purchasedAt,
    90,
    new Date(purchasedAt.getTime() + 90 * PRODUCT_CYCLE_DAY_MS),
  );

  assert.equal(info.isMatured, true);
  assert.equal(info.elapsedCycles, 90);
});

test("invalid dates or durations are never collectible", () => {
  assert.equal(
    getProductMaturityInfo("not-a-date", 2, new Date()).isMatured,
    false,
  );
  assert.equal(
    getProductMaturityInfo(purchasedAt, 0, new Date()).isMatured,
    false,
  );
});
