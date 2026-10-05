import assert from "node:assert/strict";
import test from "node:test";
import {
  getProductPurchaseBlockReason,
  hasActiveFixedPlan,
  type PurchaseHistoryRecord,
} from "../shared/product-purchase-policy";

const historyEntry = (
  overrides: Partial<PurchaseHistoryRecord> = {},
): PurchaseHistoryRecord => ({
  category: "fixed",
  duration: 30,
  cyclesCompleted: 0,
  isActive: true,
  activityLaunchVersion: null,
  ...overrides,
});

test("fixed products allow repeat purchases", () => {
  assert.equal(
    getProductPurchaseBlockReason(
      { category: "fixed", activityAvailableAt: null },
      [historyEntry()],
      1,
    ),
    null,
  );
});

test("a fixed plan unlocks restricted categories only while active and before maturity", () => {
  assert.equal(hasActiveFixedPlan([historyEntry()]), true);
  assert.equal(hasActiveFixedPlan([historyEntry({ isActive: false })]), false);
  assert.equal(hasActiveFixedPlan([historyEntry({ cyclesCompleted: 30 })]), false);
});

test("wellness and activity products require an active fixed plan", () => {
  assert.equal(
    getProductPurchaseBlockReason(
      { category: "wellness", activityAvailableAt: null },
      [],
      1,
    ),
    "fixed_plan_required",
  );
  assert.equal(
    getProductPurchaseBlockReason(
      { category: "activities", activityAvailableAt: "2029-01-01T00:00:00.000Z" },
      [historyEntry({ isActive: false })],
      1,
    ),
    "fixed_plan_required",
  );
});

test("wellness allows another purchase once the previous cycle is finished", () => {
  assert.equal(
    getProductPurchaseBlockReason(
      { category: "wellness", activityAvailableAt: null },
      [
        historyEntry(),
        historyEntry({
          category: "wellness",
          cyclesCompleted: 30,
          isActive: false,
        }),
      ],
      1,
    ),
    null,
  );
});

test("wellness blocks a second purchase while its previous investment is active", () => {
  assert.equal(
    getProductPurchaseBlockReason(
      { category: "wellness", activityAvailableAt: null },
      [
        historyEntry(),
        historyEntry({ category: "wellness", cyclesCompleted: 29 }),
      ],
      1,
    ),
    "wellness_in_progress",
  );
});

test("activity products require a scheduled opening time", () => {
  assert.equal(
    getProductPurchaseBlockReason(
      { category: "activities", activityAvailableAt: null },
      [historyEntry()],
      1,
    ),
    "activity_schedule_required",
  );
});

test("activity products stay locked until their GMT opening time", () => {
  assert.equal(
    getProductPurchaseBlockReason(
      { category: "activities", activityAvailableAt: "2030-01-01T00:00:00.000Z" },
      [historyEntry()],
      1,
      new Date("2029-12-31T23:59:59.999Z"),
    ),
    "activity_not_open_yet",
  );
});

test("a completed activity purchase still uses its one-per-launch allowance", () => {
  assert.equal(
    getProductPurchaseBlockReason(
      { category: "activities", activityAvailableAt: "2029-01-01T00:00:00.000Z" },
      [
        historyEntry(),
        historyEntry({
          category: "activities",
          isActive: false,
          activityLaunchVersion: 3,
        }),
      ],
      3,
      new Date("2030-01-01T00:00:00.000Z"),
    ),
    "activity_already_purchased",
  );
});

test("ongoing activity investments from an earlier launch do not block the next launch", () => {
  assert.equal(
    getProductPurchaseBlockReason(
      { category: "activities", activityAvailableAt: "2029-01-01T00:00:00.000Z" },
      [
        historyEntry(),
        historyEntry({
          category: "activities",
          activityLaunchVersion: 2,
        }),
      ],
      3,
      new Date("2030-01-01T00:00:00.000Z"),
    ),
    null,
  );
});