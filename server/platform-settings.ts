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
    withdrawalMinimum: toNumber("withdrawalMinimum"),
    withdrawalFeePercentage: toNumber("withdrawalFeePercentage"),
  });

  if (!result.success) {
    throw new Error("Les paramètres financiers de la plateforme sont invalides.");
  }

  return result.data;
}