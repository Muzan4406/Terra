import {
  DEFAULT_BUSINESS_SETTINGS,
  platformBusinessSettingsSchema,
  type PlatformBusinessSettings,
} from "@shared/schema";

export function resolvePlatformBusinessSettings(
  storedSettings: Record<string, string>,
): PlatformBusinessSettings {
  const toNumber = (key: keyof PlatformBusinessSettings) =>
    storedSettings[key] === undefined
      ? DEFAULT_BUSINESS_SETTINGS[key]
      : Number(storedSettings[key]);

  const result = platformBusinessSettingsSchema.safeParse({
    referralLevel1Percentage: toNumber("referralLevel1Percentage"),
    referralLevel2Percentage: toNumber("referralLevel2Percentage"),
    referralLevel3Percentage: toNumber("referralLevel3Percentage"),
    signupBonus: toNumber("signupBonus"),
    depositMinimum: toNumber("depositMinimum"),
    withdrawalMinimum: toNumber("withdrawalMinimum"),
    withdrawalFeePercentage: toNumber("withdrawalFeePercentage"),
    withdrawalStartHourGmt: toNumber("withdrawalStartHourGmt"),
    withdrawalEndHourGmt: toNumber("withdrawalEndHourGmt"),
  });

  if (!result.success) {
    throw new Error("Les paramètres financiers de la plateforme sont invalides.");
  }

  return result.data;
}

export function getDepositMinimumError(
  amount: number,
  minimum: number,
): string | undefined {
  if (amount >= minimum) return undefined;
  return `Le montant minimum du dépôt est de ${minimum.toLocaleString("fr-FR")} FCFA.`;
}