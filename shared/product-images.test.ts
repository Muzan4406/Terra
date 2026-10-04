import assert from "node:assert/strict";
import test from "node:test";
import {
  getNextProductImage,
  getProductImageMap,
  PRODUCT_IMAGES,
  type ProductImageRecord,
} from "./product-images";

function product(
  id: string,
  level: number,
  category: ProductImageRecord["category"],
  imageUrl: string | null = null,
): ProductImageRecord {
  return { id, level, category, imageUrl };
}

test("keeps fixed-product photos tied to their VIP levels", () => {
  const products = Array.from({ length: 6 }, (_, index) =>
    product(`fixed-${index + 1}`, index + 1, "fixed"),
  );
  const imageMap = getProductImageMap(products);

  products.forEach((item, index) => {
    assert.equal(imageMap.get(item.id), PRODUCT_IMAGES.fixed[index]);
  });
  assert.equal(getNextProductImage(products, "fixed"), undefined);
});

test("assigns separate category photos in order and returns the next unused one", () => {
  const products = [
    product("wellness-1", 7, "wellness"),
    product("wellness-2", 8, "wellness"),
    product("activities-1", 9, "activities"),
  ];
  const imageMap = getProductImageMap(products);

  assert.equal(imageMap.get("wellness-1"), PRODUCT_IMAGES.wellness[0]);
  assert.equal(imageMap.get("wellness-2"), PRODUCT_IMAGES.wellness[1]);
  assert.equal(imageMap.get("activities-1"), PRODUCT_IMAGES.activities[0]);
  assert.equal(getNextProductImage(products, "wellness"), PRODUCT_IMAGES.wellness[2]);
});

test("preserves explicit photo assignments and frees a photo when a product changes category", () => {
  const products = [
    product("wellness-1", 7, "wellness", PRODUCT_IMAGES.wellness[2]),
    product("wellness-2", 8, "wellness"),
  ];

  assert.equal(getProductImageMap(products).get("wellness-1"), PRODUCT_IMAGES.wellness[2]);
  assert.equal(getNextProductImage(products, "wellness"), PRODUCT_IMAGES.wellness[0]);
  assert.equal(getNextProductImage(products, "activities", "wellness-1"), PRODUCT_IMAGES.activities[0]);
});