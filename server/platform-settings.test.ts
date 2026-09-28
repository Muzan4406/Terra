import assert from "node:assert/strict";
import test from "node:test";
import {
  getDepositMinimumError,
  resolvePlatformBusinessSettings,
} from "./platform-settings";

test("uses the configured deposit minimum immediately and preserves the default", () => {
  assert.equal(resolvePlatformBusinessSettings({}).depositMinimum, 3000);
  assert.equal(
    resolvePlatformBusinessSettings({ depositMinimum: "7000" }).depositMinimum,
    7000,
  );
});

test("accepts deposits at the current minimum and rejects lower amounts", () => {
  assert.equal(getDepositMinimumError(5000, 5000), undefined);
  assert.equal(getDepositMinimumError(5001, 5000), undefined);
  assert.match(getDepositMinimumError(4999, 5000) ?? "", /5/);
});