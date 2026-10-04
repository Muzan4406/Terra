import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import {
  canAcceptAshtechWebhook,
  filterAvailableAshtechOperators,
  isValidAshtechWebhookSignature,
  normalizeAshtechTransactionStatus,
  normalizeAshtechPhone,
  parseEnabledAshtechCountries,
  verifyAshtechTransaction,
} from "./ashtechpay";

test("removes Celtis only from Benin's AshTech operator list", () => {
  assert.deepEqual(
    filterAvailableAshtechOperators("BJ", ["Celtis", "  cElTiS ", "Moov Money"]),
    ["Moov Money"],
  );
  assert.deepEqual(
    filterAvailableAshtechOperators("TG", ["Celtis", "Moov Money"]),
    ["Celtis", "Moov Money"],
  );
});

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

test("normalizes AshTech success aliases to confirmed status", () => {
  assert.equal(normalizeAshtechTransactionStatus("success"), "completed");
  assert.equal(normalizeAshtechTransactionStatus("succeeded"), "completed");
  assert.equal(normalizeAshtechTransactionStatus(" COMPLETED "), "completed");
  assert.equal(normalizeAshtechTransactionStatus("pending"), "pending");
  assert.equal(normalizeAshtechTransactionStatus("failed"), "failed");
  assert.equal(normalizeAshtechTransactionStatus("processing"), undefined);
  assert.equal(normalizeAshtechTransactionStatus(null), undefined);
});

test("verifies the exact AshTech transaction before accepting a success alias", () => {
  const expected = {
    transactionId: "tx-1",
    acceptedReferences: ["deposit-ref", "deposit-id"],
    amount: 5000,
    currency: "XOF",
    country: "TG",
    operator: "T-Money",
  };
  const transaction = {
    transaction_id: "tx-1",
    reference: "deposit-ref",
    amount: "5000",
    currency: "XOF",
    country_code: "TG",
    operator: "T-Money",
    status: "success",
  };

  assert.equal(verifyAshtechTransaction(transaction, expected), "completed");
  assert.equal(
    verifyAshtechTransaction({ ...transaction, status: "pending" }, expected),
    "pending",
  );
  assert.throws(
    () => verifyAshtechTransaction({ ...transaction, transaction_id: "other" }, expected),
    /transaction_id_mismatch/,
  );
  assert.throws(
    () => verifyAshtechTransaction({ ...transaction, reference: "other" }, expected),
    /reference_mismatch/,
  );
  assert.throws(
    () => verifyAshtechTransaction({ ...transaction, amount: 5001 }, expected),
    /amount_mismatch/,
  );
  assert.throws(
    () => verifyAshtechTransaction({ ...transaction, currency: "XAF" }, expected),
    /currency_mismatch/,
  );
  assert.throws(
    () => verifyAshtechTransaction({ ...transaction, operator: "Other" }, expected),
    /operator_mismatch/,
  );
  assert.throws(
    () => verifyAshtechTransaction({ ...transaction, country_code: "CI" }, expected),
    /country_mismatch/,
  );
  assert.throws(
    () => verifyAshtechTransaction({ ...transaction, status: "processing" }, expected),
    /unknown_status/,
  );
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
  assert.equal(
    canAcceptAshtechWebhook(rawBody, timestamp, signature, secret, now),
    true,
  );
  assert.equal(
    canAcceptAshtechWebhook(rawBody, "", "", undefined, now),
    true,
  );
  assert.equal(
    canAcceptAshtechWebhook(rawBody, "", "", secret, now),
    true,
  );
  assert.equal(
    canAcceptAshtechWebhook(rawBody, timestamp, signature, undefined, now),
    false,
  );
  assert.equal(
    canAcceptAshtechWebhook(undefined, "", "", undefined, now),
    false,
  );
});