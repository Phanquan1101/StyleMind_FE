import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { expect, it, vi } from "vitest"

import type { CartLineDetail } from "../model/cartSelectors"
import { CartLineItem } from "./CartLineItem"

it("fills the cart item image frame without leaving an empty strip", () => {
  const detail = {
    line: { id: "line-1", productId: "product-1", variantId: "variant-1", quantity: 1, source: "shop" },
    product: {
      id: "product-1",
      name: "Áo ba lỗ",
      brand: "StyleMind",
      variants: [{ id: "variant-1", color: "Đen", size: "M", stock: 2, active: true, images: [] }],
    },
    variant: { id: "variant-1", color: "Đen", size: "M", stock: 2, active: true, images: [] },
    image: { id: "image-1", url: "/product.jpg", alt: "Áo ba lỗ", isPrimary: true, order: 0 },
    quantity: 1,
    unitPrice: 643_000,
    lineTotal: 643_000,
  } as unknown as CartLineDetail

  render(
    <MemoryRouter>
      <CartLineItem
        detail={detail}
        onQuantityChange={vi.fn()}
        onVariantChange={vi.fn()}
        onRemove={vi.fn()}
      />
    </MemoryRouter>,
  )

  const image = screen.getByRole("img", { name: "Áo ba lỗ" })
  expect(image).toHaveClass("h-full", "w-full", "object-cover")
  expect(image.closest("a")).toHaveClass("aspect-[4/5]", "sm:h-full")
})
