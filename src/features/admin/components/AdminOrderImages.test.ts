import { expect, it } from "vitest"
import type { ProductVariant } from "@/api/commerce.types"
import { primaryVariantImage } from "./AdminOrdersPanel"

function variant(images: ProductVariant["images"]): ProductVariant {
  return { variant_id: "variant-1", images } as ProductVariant
}

it("uses the primary variant image for an order item fallback", () => {
  expect(
    primaryVariantImage(
      variant([
        {
          image_id: "second",
          variant_id: "variant-1",
          image_url: "/second.jpg",
          alt_text: null,
          display_order: 0,
          is_primary: false,
        },
        {
          image_id: "primary",
          variant_id: "variant-1",
          image_url: "/primary.jpg",
          alt_text: null,
          display_order: 3,
          is_primary: true,
        },
      ]),
    ),
  ).toBe("/primary.jpg")
})

it("falls back to display order when a variant has no primary image", () => {
  expect(
    primaryVariantImage(
      variant([
        {
          image_id: "later",
          variant_id: "variant-1",
          image_url: "/later.jpg",
          alt_text: null,
          display_order: 2,
          is_primary: false,
        },
        {
          image_id: "first",
          variant_id: "variant-1",
          image_url: "/first.jpg",
          alt_text: null,
          display_order: 1,
          is_primary: false,
        },
      ]),
    ),
  ).toBe("/first.jpg")
})
