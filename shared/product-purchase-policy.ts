import type { ProductCategory } from "@shared/schema";

export const ACTIVITY_LAUNCH_VERSION_SETTING_KEY = "activityLaunchVersion";
export const INITIAL_ACTIVITY_LAUNCH_VERSION = 1;

export type ProductPurchaseBlockReason =
  | "activity_schedule_required"
  | "activity_not_open_yet"
  | "wellness_in_progress"
  | "activity_already_purchased";

export type PurchaseHistoryRecord = {
  category: ProductCategory;
  duration: number;
  cyclesCompleted: number;
  isActive: boolean;
  activityLaunchVersion: number | null;
};

export type PurchaseEligibilityProduct = {
  category: ProductCategory;
  activityAvailableAt: Date | string | null;
};

export function getProductPurchaseBlockReason(
  product: PurchaseEligibilityProduct,
  purchaseHistory: PurchaseHistoryRecord[],
  currentActivityLaunchVersion: number,
  now = new Date(),
): ProductPurchaseBlockReason | null {
  if (product.category === "wellness") {
    const hasUnfinishedWellness = purchaseHistory.some((purchase) =>
      purchase.category === "wellness" &&
      purchase.isActive &&
      purchase.cyclesCompleted < purchase.duration
    );
    if (hasUnfinishedWellness) return "wellness_in_progress";
  }

  if (product.category !== "activities") return null;
  if (!product.activityAvailableAt) return "activity_schedule_required";

  const availableAt = new Date(product.activityAvailableAt);
  if (Number.isNaN(availableAt.getTime())) return "activity_schedule_required";

  const alreadyPurchasedThisLaunch = purchaseHistory.some((purchase) =>
    purchase.category === "activities" &&
    purchase.activityLaunchVersion === currentActivityLaunchVersion
  );
  if (alreadyPurchasedThisLaunch) return "activity_already_purchased";

  if (availableAt.getTime() > now.getTime()) return "activity_not_open_yet";
  return null;
}