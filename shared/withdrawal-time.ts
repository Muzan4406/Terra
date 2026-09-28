import { ELIGIBLE_COUNTRIES } from "./schema";

export const WITHDRAWAL_GMT_HOURS = {
  start: 10,
  end: 17,
} as const;

export function getWithdrawalHoursForCountry(countryCode: string) {
  const offset = ELIGIBLE_COUNTRIES.find((country) => country.code === countryCode)
    ?.gmtOffsetHours ?? 0;

  return {
    start: WITHDRAWAL_GMT_HOURS.start + offset,
    end: WITHDRAWAL_GMT_HOURS.end + offset,
  };
}

export function isWithdrawalWindowOpen(at: Date = new Date()): boolean {
  const minutesSinceUtcMidnight = at.getUTCHours() * 60 + at.getUTCMinutes();
  const startMinutes = WITHDRAWAL_GMT_HOURS.start * 60;
  const endMinutes = WITHDRAWAL_GMT_HOURS.end * 60;

  return minutesSinceUtcMidnight >= startMinutes && minutesSinceUtcMidnight < endMinutes;
}