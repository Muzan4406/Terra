import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidAshtechWebhookSignature,
  normalizeAshtechPhone,
  parseEnabledAshtechCountries,
} from "./ashtechpay";

test("normalizes local and international phone numbers to the selected country", () => {
  assert.equal(normalizeAshtechPhone("90 12 34 56", "TG"), "22890123456");
  assert.equal(normalizeAshtechPhone("+228 90 12 34 56", "TG"), "22890123456");
});

test("rejects phone numbers that are too short", () => {
  assert.throws(() => normalizeAshtechPhone("123", "TG"), /invalide/i);
});

test("only parses unique eligible AshTech country codes", () => {
  assert.deepEqual(
    parseEnabledAshtechCountries('["TG","XX","TG","CI"]'),
    ["TG", "CI"],
  );
  assert.deepEqual(parseEnabledAshtechCountries("not-json"), []);
});

test("verifies the documented raw-body HMAC signature and rejects stale requests", () => {
  const secret = "test-only-webhook-secret";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = Buffer.from('{"reference":"test-ref","status":"completed"}');
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex");
  const signature = `sha256=${digest}`;
  const now = Number(timestamp) * 1000;

  assert.equal(
    isValidAshtechWebhookSignature(rawBody, timestamp, signature, secret, now),
    true,
  );
  assert.equal(
    isValidAshtechWebhookSignature(rawBody, timestamp, `sha256=${"0".repeat(64)}`, secret, now),
    false,
  );
  assert.equal(
    isValidAshtechWebhookSignature(rawBody, timestamp, signature, secret, now + 6 * 60 * 1000),
    false,
  );
});