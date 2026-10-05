import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import {
  canAcceptAshtechWebhook,
  createAshtechCollection,
  filterAvailableAshtechOperators,
  getAshtechReadiness,
  getAshtechTransaction,
  isValidAshtechWebhookSignature,
  normalizeAshtechTransactionStatus,
  normalizeAshtechPhone,
  parseEnabledAshtechCountries,
  verifyAshtechTransaction,
} from "./ashtechpay";

test("sends the configured AshTech merchant profile ID for collections and transaction checks", async () => {
  const previousApiKey = process.env.ASHTECH_API_KEY;
  const previousUserId = process.env.ASHTECH_USER_ID;
  const previousFetch = globalThis.fetch;
  const requests: Array<{ url: string; body?: string }> = [];

  process.env.ASHTECH_API_KEY = "test-api-key";
  process.env.ASHTECH_USER_ID = "merchant-profile-id";
  globalThis.fetch = (async (input, init) => {
    requests.push({
      url: String(input),
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  try {
    await createAshtechCollection({
      user_id: "beko-customer-id",
      amount: 3000,
      currency: "XOF",
      country_code: "TG",
      operator: "Mixx By Yas",
      phone: "22800000000",
    });
    await getAshtechTransaction("transaction-1");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.ASHTECH_API_KEY;
    else process.env.ASHTECH_API_KEY = previousApiKey;
    if (previousUserId === undefined) delete process.env.ASHTECH_USER_ID;
    else process.env.ASHTECH_USER_ID = previousUserId;
  }

  assert.equal(
    JSON.parse(requests[0].body ?? "{}").user_id,
    "merchant-profile-id",
  );
  assert.equal(
    requests[1].url,
    "https://www.ashtechpay.com/v1/transaction/transaction-1?user_id=merchant-profile-id",
  );
});

test("requires an AshTech merchant profile ID before creating a collection", async () => {
  const previousApiKey = process.env.ASHTECH_API_KEY;
  const previousUserId = process.env.ASHTECH_USER_ID;
  process.env.ASHTECH_API_KEY = "test-api-key";
  delete process.env.ASHTECH_USER_ID;

  try {
    assert.equal(getAshtechReadiness().userIdConfigured, false);
    await assert.rejects(
      createAshtechCollection({ amount: 3000 }),
      /ASHTECH_USER_ID/,
    );
  } finally {
    if (previousApiKey === undefined) delete process.env.ASHTECH_API_KEY;
    else process.env.ASHTECH_API_KEY = previousApiKey;
    if (previousUserId === undefined) delete process.env.ASHTECH_USER_ID;
    else process.env.ASHTECH_USER_ID = previousUserId;
  }
});

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