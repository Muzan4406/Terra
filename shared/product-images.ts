import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from "./schema";

export const PRODUCT_IMAGES: Record<ProductCategory, readonly string[]> = {
  fixed: [
    "/products/fixed-01.jpg",
    "/products/fixed-02.jpg",
    "/products/fixed-03.jpg",
    "/products/fixed-04.jpg",
    "/products/fixed-05.jpg",
    "/products/fixed-06.jpg",
  ],
  wellness: [
    "/products/wellness-01.jpg",
    "/products/wellness-02.jpg",
    "/products/wellness-03.jpg",
    "/products/wellness-04.jpg",
    "/products/wellness-05.jpg",
  ],
  activities: [
    "/products/activities-01.jpg",
    "/products/activities-02.jpg",
    "/products/activities-03.jpg",
    "/products/activities-04.jpg",
    "/products/activities-05.jpg",
  ],
};

export type ProductImageRecord = Pick<Product, "id" | "level" | "category" | "imageUrl">;

export function getProductImageMap(products: readonly ProductImageRecord[]) {
  const imageByProductId = new Map<string, string>();

  for (const category of PRODUCT_CATEGORIES) {
    const categoryProducts = products
      .filter((product) => product.category === category)
      .sort((a, b) => a.level - b.level);

    categoryProducts.forEach((product, index) => {
      const fallbackIndex = category === "fixed" ? product.level - 1 : index;
      const imageUrl = product.imageUrl?.trim() || PRODUCT_IMAGES[category][fallbackIndex];
      if (imageUrl) imageByProductId.set(product.id, imageUrl);
    });
  }

  return imageByProductId;
}

export function getNextProductImage(
  products: readonly ProductImageRecord[],
  category: ProductCategory,
  excludedProductId?: string,
) {
  const remainingProducts = products.filter((product) => product.id !== excludedProductId);
  const usedImages = new Set(getProductImageMap(remainingProducts).values());
  return PRODUCT_IMAGES[category].find((imageUrl) => !usedImages.has(imageUrl));
}