import { ELIGIBLE_COUNTRIES } from "./schema";

export interface WithdrawalHoursGmt {
  start: number;
  end: number;
}

export const WITHDRAWAL_GMT_HOURS: WithdrawalHoursGmt = {
  start: 10,
  end: 17,
};

export function getWithdrawalHoursForCountry(
  countryCode: string,
  hours: WithdrawalHoursGmt = WITHDRAWAL_GMT_HOURS,
) {
  const offset = ELIGIBLE_COUNTRIES.find((country) => country.code === countryCode)
    ?.gmtOffsetHours ?? 0;
  const toLocalHour = (hour: number) => (hour + offset + 24) % 24;

  return {
    start: toLocalHour(hours.start),
    end: toLocalHour(hours.end),
  };
}

export function isWithdrawalWindowOpen(
  at: Date = new Date(),
  hours: WithdrawalHoursGmt = WITHDRAWAL_GMT_HOURS,
): boolean {
  const minutesSinceUtcMidnight = at.getUTCHours() * 60 + at.getUTCMinutes();
  const startMinutes = hours.start * 60;
  const endMinutes = hours.end * 60;

  if (startMinutes < endMinutes) {
    return minutesSinceUtcMidnight >= startMinutes && minutesSinceUtcMidnight < endMinutes;
  }
  return minutesSinceUtcMidnight >= startMinutes || minutesSinceUtcMidnight < endMinutes;
}