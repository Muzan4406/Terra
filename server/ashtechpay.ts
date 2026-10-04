import { createHmac, timingSafeEqual } from "node:crypto";
import { ELIGIBLE_COUNTRIES } from "@shared/schema";

const ASHTECH_BASE_URL = "https://www.ashtechpay.com";
const COUNTRY_CACHE_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;

export interface AshtechCountry {
  code: string;
  name: string;
  currency: string;
  operators: string[];
}

export interface AshtechResponse {
  status: number;
  body: Record<string, unknown> | unknown[];
}

let countryCache: { expiresAt: number; countries: AshtechCountry[] } | undefined;

export class AshtechConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AshtechConfigurationError";
  }
}

export type AshtechVerificationFailureCode =
  | "provider_configuration"
  | "provider_unavailable"
  | "provider_http_error"
  | "catalog_unavailable"
  | "transaction_id_mismatch"
  | "reference_mismatch"
  | "amount_mismatch"
  | "currency_mismatch"
  | "country_mismatch"
  | "operator_mismatch"
  | "unknown_status";

export class AshtechVerificationError extends Error {
  constructor(
    readonly code: AshtechVerificationFailureCode,
    readonly providerHttpStatus?: number,
  ) {
    super(code);
    this.name = "AshtechVerificationError";
  }
}

export interface AshtechTransactionExpectation {
  transactionId: string;
  acceptedReferences: string[];
  amount: number;
  currency: string;
  country: string;
  operator: string;
}

export function verifyAshtechTransaction(
  transaction: Record<string, unknown>,
  expected: AshtechTransactionExpectation,
): "pending" | "completed" | "failed" {
  const returnedTransactionId =
    typeof transaction.transaction_id === "string"
      ? transaction.transaction_id.trim()
      : "";
  if (!returnedTransactionId || returnedTransactionId !== expected.transactionId) {
    throw new AshtechVerificationError("transaction_id_mismatch");
  }

  const reference =
    typeof transaction.reference === "string"
      ? transaction.reference.trim()
      : "";
  if (!reference || !expected.acceptedReferences.includes(reference)) {
    throw new AshtechVerificationError("reference_mismatch");
  }

  const amount =
    typeof transaction.amount === "number" || typeof transaction.amount === "string"
      ? Number(transaction.amount)
      : Number.NaN;
  if (!Number.isFinite(amount) || amount !== expected.amount) {
    throw new AshtechVerificationError("amount_mismatch");
  }

  if (
    typeof transaction.currency !== "string" ||
    transaction.currency.trim() !== expected.currency
  ) {
    throw new AshtechVerificationError("currency_mismatch");
  }

  if (
    typeof transaction.operator !== "string" ||
    transaction.operator.trim() !== expected.operator
  ) {
    throw new AshtechVerificationError("operator_mismatch");
  }

  if (
    typeof transaction.country_code === "string" &&
    transaction.country_code.trim() !== expected.country
  ) {
    throw new AshtechVerificationError("country_mismatch");
  }

  const status = normalizeAshtechTransactionStatus(transaction.status);
  if (!status) {
    throw new AshtechVerificationError("unknown_status");
  }
  return status;
}

function getApiKey(): string {
  const key = process.env.ASHTECH_API_KEY?.trim();
  if (!key) {
    throw new AshtechConfigurationError(
      "La clé API AshTech Pay n'est pas configurée.",
    );
  }
  return key;
}

export function getAshtechReadiness() {
  const publicUrl = process.env.APP_PUBLIC_URL?.trim();
  let publicUrlConfigured = false;
  if (publicUrl) {
    try {
      publicUrlConfigured = new URL(publicUrl).protocol === "https:";
    } catch {
      publicUrlConfigured = false;
    }
  }

  return {
    apiKeyConfigured: Boolean(process.env.ASHTECH_API_KEY?.trim()),
    webhookSecretConfigured: Boolean(process.env.ASHTECH_WEBHOOK_SECRET?.trim()),
    publicUrlConfigured,
  };
}

export function getAshtechWebhookUrl(): string {
  const base = process.env.APP_PUBLIC_URL?.trim();
  if (!base) {
    throw new AshtechConfigurationError(
      "L'URL publique HTTPS de l'application (APP_PUBLIC_URL) n'est pas configurée.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    throw new AshtechConfigurationError(
      "APP_PUBLIC_URL doit être une URL publique HTTPS valide.",
    );
  }

  if (parsed.protocol !== "https:" || !parsed.hostname) {
    throw new AshtechConfigurationError(
      "APP_PUBLIC_URL doit utiliser HTTPS.",
    );
  }

  return new URL("/api/webhooks/ashtechpay", parsed.origin).toString();
}

export function getOptionalAshtechWebhookSecret(): string | undefined {
  const secret = process.env.ASHTECH_WEBHOOK_SECRET?.trim();
  return secret || undefined;
}

async function requestAshtech(
  path: string,
  options: { method?: "GET" | "POST"; body?: Record<string, unknown> } = {},
): Promise<AshtechResponse> {
  const response = await fetch(`${ASHTECH_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const responseText = await response.text();
  let body: Record<string, unknown> | unknown[] = {};
  try {
    const parsed: unknown = JSON.parse(responseText);
    if (Array.isArray(parsed)) {
      body = parsed;
    } else if (parsed && typeof parsed === "object") {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    // Preserve the HTTP status so callers can distinguish a refusal from
    // an ambiguous successful request with an invalid response body.
  }

  return { status: response.status, body };
}

export async function getAshtechCountries(
  forceRefresh = false,
): Promise<AshtechCountry[]> {
  if (!forceRefresh && countryCache && countryCache.expiresAt > Date.now()) {
    return countryCache.countries;
  }

  const response = await requestAshtech("/v1/countries");
  if (response.status < 200 || response.status >= 300 || !Array.isArray(response.body)) {
    throw new Error("Impossible de charger le catalogue AshTech Pay.");
  }

  const countries = response.body.flatMap((item): AshtechCountry[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const value = item as Record<string, unknown>;
    if (
      typeof value.code !== "string" ||
      typeof value.name !== "string" ||
      typeof value.currency !== "string" ||
      !Array.isArray(value.operators)
    ) {
      return [];
    }

    const operators = filterAvailableAshtechOperators(
      value.code,
      value.operators.filter(
        (operator): operator is string =>
          typeof operator === "string" && operator.trim().length > 0,
      ),
    );
    if (!operators.length) return [];

    return [{
      code: value.code,
      name: value.name,
      currency: value.currency,
      operators,
    }];
  });

  countryCache = { countries, expiresAt: Date.now() + COUNTRY_CACHE_MS };
  return countries;
}

export function filterAvailableAshtechOperators(
  countryCode: string,
  operators: string[],
): string[] {
  const isBenin = countryCode.trim().toUpperCase() === "BJ";
  return operators.filter(
    (operator) => !(isBenin && operator.trim().toLowerCase() === "celtis"),
  );
}

export function findEligibleCountry(code: string) {
  return ELIGIBLE_COUNTRIES.find((country) => country.code === code);
}

export function normalizeAshtechPhone(phone: string, countryCode: string): string {
  const country = findEligibleCountry(countryCode);
  if (!country) throw new Error("Pays non pris en charge.");

  const digits = phone.replace(/\D/g, "");
  let normalized: string;

  if (digits.startsWith(country.dialCode)) {
    normalized = digits;
  } else {
    const localNumber = digits.startsWith("0") ? digits.slice(1) : digits;
    normalized = `${country.dialCode}${localNumber}`;
  }

  if (normalized.length < 8 || normalized.length > 15) {
    throw new Error("Numéro de téléphone invalide.");
  }

  return normalized;
}

export async function createAshtechCollection(
  payload: Record<string, unknown>,
): Promise<AshtechResponse> {
  return requestAshtech("/v1/collect", { method: "POST", body: payload });
}

export async function getAshtechTransaction(
  transactionId: string,
): Promise<AshtechResponse> {
  return requestAshtech(`/v1/transaction/${encodeURIComponent(transactionId)}`);
}

export function normalizeAshtechTransactionStatus(
  value: unknown,
): "pending" | "completed" | "failed" | undefined {
  if (typeof value !== "string") return undefined;

  switch (value.trim().toLowerCase()) {
    case "pending":
      return "pending";
    case "completed":
    case "success":
    case "succeeded":
      return "completed";
    case "failed":
      return "failed";
    default:
      return undefined;
  }
}

export function ashtechErrorCode(body: Record<string, unknown>): string | undefined {
  return typeof body.error === "string" ? body.error : undefined;
}

export function ashtechUserFacingError(
  body: Record<string, unknown>,
): string {
  if (ashtechErrorCode(body) === "api_not_enabled") {
    return "L'accès Direct API n'est pas activé sur le compte AshTech Pay.";
  }
  return "AshTech Pay a refusé cette demande. Vérifiez les informations et réessayez.";
}

export function isValidAshtechWebhookSignature(
  rawBody: Buffer,
  timestampHeader: string,
  signatureHeader: string,
  secret: string,
  nowMs = Date.now(),
): boolean {
  if (!/^\d{10,13}$/.test(timestampHeader)) return false;
  const timestamp = Number(timestampHeader);
  const timestampMs = timestampHeader.length === 10 ? timestamp * 1000 : timestamp;
  if (!Number.isFinite(timestampMs) || Math.abs(nowMs - timestampMs) > 5 * 60 * 1000) {
    return false;
  }

  const match = /^sha256=([a-f\d]{64})$/i.exec(signatureHeader);
  if (!match) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestampHeader}.`)
    .update(rawBody)
    .digest();
  const received = Buffer.from(match[1], "hex");

  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function canAcceptAshtechWebhook(
  rawBody: Buffer | undefined,
  timestampHeader: string,
  signatureHeader: string,
  secret?: string,
  nowMs = Date.now(),
): boolean {
  if (!rawBody) return false;

  const hasTimestamp = Boolean(timestampHeader.trim());
  const hasSignature = Boolean(signatureHeader.trim());

  if (!hasTimestamp && !hasSignature) {
    return true;
  }
  if (!secret || !hasTimestamp || !hasSignature) {
    return false;
  }

  return isValidAshtechWebhookSignature(
    rawBody,
    timestampHeader,
    signatureHeader,
    secret,
    nowMs,
  );
}

export function parseEnabledAshtechCountries(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const eligibleCodes = new Set<string>(
      ELIGIBLE_COUNTRIES.map((country) => country.code),
    );
    return Array.from(new Set(parsed.filter(
      (code): code is string =>
        typeof code === "string" && eligibleCodes.has(code),
    )));
  } catch {
    return [];
  }
}