import { Minus, Plus, ShoppingBag, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import type { ProductSize } from '@/entities/product/model/types'
import { useAuth } from '@/features/auth'
import { ProductCard } from '@/features/catalog/components/ProductCard'
import { loadCommerceProduct } from '@/features/catalog/data/commerceCatalog'
import { useActiveCommerce } from '@/features/cart/model/AccountCommerceProvider'
import { useCommerceDisplay } from '@/features/cart/model/GuestCommerceProvider'
import { guestCartErrorMessage } from '@/features/cart/data/guestCartApi'
import { beginAccountSelection } from '@/features/checkout/model/accountSelection'
import type { Product } from '@/entities/product/model/types'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { Button, EmptyState, useToast } from '@/shared/ui'

import { ColorSelector } from '../components/ColorSelector'
import { ProductGallery } from '../components/ProductGallery'
import { SizeSelector } from '../components/SizeSelector'
import { describeSuggestion, sizeKindForCategory, suggestSize } from '../model/sizeSuggestion'
import { getProductSelection } from '../model/productSelection'

function normalizeQuantity(value: number) {
  return Math.max(1, value)
}

type DescriptionBlock =
  | { type: 'paragraph'; content: string }
  | { type: 'list'; items: string[]; ordered: boolean }
  | { type: 'field'; label: string; content: string }
  | { type: 'table'; label: string; headers: string[]; rows: string[][] }

const DESCRIPTION_FIELD_BOUNDARY = /(?=(?:Kiểu dáng|Phom dáng|Chất liệu|Độ co giãn|Lớp lót|Tùy chọn cỡ|Tùy chọn màu(?: sắc)?|Màu sắc|Kích thước|Hướng dẫn bảo quản|Bảo quản|Gợi ý phối đồ|Thông số kích thước(?:\s+theo nguồn)?(?:\s*\([^:]*\))?)\s*:)/gi
const DESCRIPTION_FIELD_MATCH = /^(Kiểu dáng|Phom dáng|Chất liệu|Độ co giãn|Lớp lót|Tùy chọn cỡ|Tùy chọn màu(?: sắc)?|Màu sắc|Kích thước|Hướng dẫn bảo quản|Bảo quản|Gợi ý phối đồ|Thông số kích thước(?:\s+theo nguồn)?)(\s*\([^:]*\))?\s*:\s*([\s\S]*)$/i
const COMMON_SIZES = ['4XL', '3XL', '2XL', 'XXXL', 'XXL', 'XXXXL', 'XL', 'XS', 'XXS', 'XXXS', 'S', 'M', 'L', 'Một cỡ', 'One Size']

function sizeLabelsForProduct(sizeLabels: string[]) {
  return [...new Set([...sizeLabels, ...COMMON_SIZES].map(label => label.trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
}

function matchingSize(cell: string, labels: string[]): string | null {
  return labels.find(label => label.toLocaleLowerCase('vi') === cell.trim().toLocaleLowerCase('vi')) ?? null
}

function splitAttachedSize(cell: string, labels: string[]): string[] {
  const trimmed = cell.trim()
  for (const label of labels) {
    const suffix = ` ${label}`
    if (trimmed.toLocaleLowerCase('vi').endsWith(suffix.toLocaleLowerCase('vi'))) {
      const value = trimmed.slice(0, -label.length).trim()
      if (value) return [value, trimmed.slice(-label.length)]
    }
  }
  return [trimmed]
}

function parseSizeTablesByLine(value: string): Array<{ headers: string[]; rows: string[][] }> | null {
  const lines = value.replace(/\r\n?/g, '\n').split('\n')
  const tables: Array<{ headers: string[]; rows: string[][] }> = []

  for (let index = 0; index < lines.length;) {
    const headers = lines[index].split('|').map(cell => cell.trim())
    if (headers.length < 2 || !/^(?:cỡ|kích cỡ|size)$/i.test(headers[0])) {
      index++
      continue
    }

    const rows: string[][] = []
    let rowIndex = index + 1
    while (rowIndex < lines.length) {
      const line = lines[rowIndex].trim()
      if (!line) {
        rowIndex++
        continue
      }

      const cells = line.split('|').map(cell => cell.trim())
      if (/^(?:cỡ|kích cỡ|size)$/i.test(cells[0])) break
      if (cells.length !== headers.length || !cells[0]) break
      rows.push(cells)
      rowIndex++
    }

    if (rows.length) tables.push({ headers, rows })
    index = rowIndex > index + 1 ? rowIndex : index + 1
  }

  return tables.length ? tables : null
}

function parseSizeTables(value: string, productSizes: string[]): Array<{ headers: string[]; rows: string[][] }> | null {
  const lineTables = parseSizeTablesByLine(value)
  if (lineTables) return lineTables

  const sizeLabels = sizeLabelsForProduct(productSizes)
  const cells = value.replace(/[\r\n]+/g, '|').split('|').map(cell => cell.trim()).filter(Boolean)
  const starts = cells.flatMap((cell, index) => /^(?:cỡ|kích cỡ|size)$/i.test(cell) ? [index] : [])
  if (!starts.length) return null

  const tables: Array<{ headers: string[]; rows: string[][] }> = []
  for (const [tableIndex, start] of starts.entries()) {
    const end = starts[tableIndex + 1] ?? cells.length
    const tableCells = cells.slice(start, end)
    const attachedSizeIndex = tableCells.findIndex((cell, index) => index > 0 && splitAttachedSize(cell, sizeLabels).length === 2)
    const standaloneSizeIndex = tableCells.findIndex((cell, index) => index > 0 && matchingSize(cell, sizeLabels) !== null)

    let headers: string[]
    let body: string[]
    if (attachedSizeIndex > 0 && (standaloneSizeIndex < 0 || attachedSizeIndex < standaloneSizeIndex)) {
      const [lastHeader, firstSize] = splitAttachedSize(tableCells[attachedSizeIndex], sizeLabels)
      headers = [...tableCells.slice(0, attachedSizeIndex), lastHeader]
      body = [firstSize, ...tableCells.slice(attachedSizeIndex + 1)]
    } else if (standaloneSizeIndex > 0) {
      headers = tableCells.slice(0, standaloneSizeIndex)
      body = tableCells.slice(standaloneSizeIndex)
    } else {
      return null
    }

    if (headers.length < 2) return null
    const rowCells = body.flatMap(cell => splitAttachedSize(cell, sizeLabels))
    if (!rowCells.length || rowCells.length % headers.length !== 0) return null

    const rows: string[][] = []
    for (let index = 0; index < rowCells.length; index += headers.length) {
      const row = rowCells.slice(index, index + headers.length)
      if (row.length !== headers.length || !matchingSize(row[0], sizeLabels)) return null
      rows.push(row)
    }
    if (!rows.length) return null
    tables.push({ headers, rows })
  }
  return tables
}

function getDescriptionBlocks(description: string, productSizes: string[]): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = []
  let paragraphLines: string[] = []
  let listItems: string[] = []
  let listOrdered = false

  const flushParagraph = () => {
    if (paragraphLines.length) blocks.push({ type: 'paragraph', content: paragraphLines.join(' ') })
    paragraphLines = []
  }
  const flushList = () => {
    if (listItems.length) blocks.push({ type: 'list', items: listItems, ordered: listOrdered })
    listItems = []
    listOrdered = false
  }

  const segments = description.replace(/\r\n?/g, '\n').split(DESCRIPTION_FIELD_BOUNDARY)
  for (const segment of segments) {
    const field = segment.trim().match(DESCRIPTION_FIELD_MATCH)
    if (field) {
      flushParagraph()
      flushList()
      const label = `${field[1]}${field[2] ?? ''}`.trim()
      const content = field[3].trim()
      const tables = /^(?:Thông số kích thước)/i.test(label) ? parseSizeTables(content, productSizes) : null
      if (tables) tables.forEach(table => blocks.push({ type: 'table', label, ...table }))
      else if (content) blocks.push({ type: 'field', label, content })
      continue
    }

    for (const rawLine of segment.split('\n')) {
      const line = rawLine.trim()
      if (!line) {
        flushParagraph()
        flushList()
        continue
      }

      const bullet = line.match(/^(?:(\d+)[.)]|[-*•])\s+(.+)$/)
      if (bullet) {
        flushParagraph()
        if (!listItems.length) listOrdered = Boolean(bullet[1])
        listItems.push(bullet[2].trim())
        continue
      }

      flushList()
      paragraphLines.push(line)
    }
  }

  flushParagraph()
  flushList()
  return blocks
}

export function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { state, loading: catalogLoading, error: catalogError, retry: retryCatalog } = useCommerceDisplay()
  const { currentUser } = useAuth()
  const commerce = useActiveCommerce()
  const [product, setProduct] = useState<Product | null>(null)
  const [productLoading, setProductLoading] = useState(true)
  const [productError, setProductError] = useState('')
  const [productLoadVersion, setProductLoadVersion] = useState(0)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [sizeTouched, setSizeTouched] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setProduct(null)
    setProductError('')
    setProductLoading(true)
    if (!productId) {
      setProductError('Không tìm thấy sản phẩm.')
      setProductLoading(false)
      return () => controller.abort()
    }

    void loadCommerceProduct(productId, controller.signal)
      .then(value => { if (!controller.signal.aborted) setProduct(value.active ? value : null) })
      .catch(() => { if (!controller.signal.aborted) setProductError('Không tải được thông tin sản phẩm từ hệ thống. Vui lòng thử lại.') })
      .finally(() => { if (!controller.signal.aborted) setProductLoading(false) })
    return () => controller.abort()
  }, [productId, productLoadVersion])

  const selection = useMemo(
    () => (product ? getProductSelection(product, { color: selectedColor, size: selectedSize }) : null),
    [product, selectedColor, selectedSize],
  )

  useEffect(() => {
    setSelectedColor(null)
    setSelectedSize(null)
    setQuantity(1)
    setValidationError(null)
    setSizeTouched(false)
  }, [productId])

  useEffect(() => {
    if (!selection) return
    setSelectedColor(current => current ?? selection.selectedColor)
  }, [selection])

  const sizeSuggestion = useMemo(() => {
    if (!currentUser || !product || !selection) return null
    const categoryLabel = product.categoryName ?? state.categories.find(category => category.id === product.categoryId)?.label
    return suggestSize(
      currentUser,
      sizeKindForCategory(categoryLabel),
      selection.sizeOptions.map(option => ({ size: option.size, available: option.available && option.stock > 0 })),
    )
  }, [currentUser, product, selection, state.categories])
  const suggestedSize = sizeSuggestion?.size ?? null

  useEffect(() => {
    if (!sizeTouched && suggestedSize) setSelectedSize(current => (current === suggestedSize ? current : suggestedSize as ProductSize))
  }, [suggestedSize, sizeTouched])

  const relatedProducts = useMemo(() => {
    if (!product || catalogLoading || catalogError) return []
    return state.products
      .filter(item => item.id !== product.id && item.active && item.categoryId === product.categoryId)
      .filter(item => item.variants.some(variant => variant.active))
      .slice(0, 4)
  }, [product, state.products, catalogLoading, catalogError])

  const retryProduct = () => {
    retryCatalog()
    setProductLoadVersion(version => version + 1)
  }

  if (productLoading) return <p role="status" className="mx-auto max-w-7xl px-5 py-12">Đang tải sản phẩm…</p>
  if (productError) return <div className="mx-auto grid max-w-7xl gap-4 px-5 py-12"><p role="alert">{productError}</p><Button onClick={retryProduct}>Tải lại sản phẩm</Button></div>
  if (!product || !selection) {
    return (
      <div className="mx-auto max-w-[var(--container-wide)] px-5 py-12 md:px-8">
        <EmptyState
          title="Không tìm thấy sản phẩm"
          description="Sản phẩm này có thể đã ngừng bán hoặc đường dẫn chưa đúng."
          action={
            <Link
              to={ROUTES.shop}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#1C1B1B] px-4 text-sm font-semibold text-white transition hover:bg-[#444746] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1B] focus-visible:ring-offset-2"
            >
              Về cửa hàng
            </Link>
          }
        />
      </div>
    )
  }

  const needsSize = selection.sizeOptions.length > 0
  const selectedVariant = needsSize ? selection.variant : selection.displayVariant
  const inStock = Boolean(selectedVariant?.active && selectedVariant.stock > 0)
  const canOrder = Boolean(inStock && (!needsSize || selectedSize))
  const hasStockForCurrentSelection = needsSize && !selectedSize
    ? selection.sizeOptions.some(option => option.stock > 0)
    : inStock
  const colorVariants = product.variants.filter(variant => variant.active && (!selection.selectedColor || variant.color === selection.selectedColor))
  const prices = colorVariants.map(variant => variant.priceOverride ?? product.basePrice)
  const lowestVariantPrice = prices.length ? Math.min(...prices) : selection.price
  const displayedPrice = needsSize && !selectedSize
    ? `Từ ${formatCurrency(lowestVariantPrice)}`
    : formatCurrency(selectedVariant?.priceOverride ?? selection.price)
  const material = selectedVariant?.material?.trim() || product.material.trim()

  const handleColorChange = (color: string) => {
    const nextSelection = getProductSelection(product, { color, size: selectedSize })
    setSelectedColor(color)
    setSelectedSize(nextSelection.canPurchase ? selectedSize : null)
    setQuantity(1)
    setValidationError(null)
  }

  const handleSizeChange = (size: ProductSize) => {
    const nextSelection = getProductSelection(product, { color: selection.selectedColor, size })
    setSizeTouched(true)
    setSelectedSize(size)
    const stock = nextSelection.variant?.stock ?? 0
    setQuantity(stock > 0 ? Math.min(stock, normalizeQuantity(quantity)) : 1)
    setValidationError(nextSelection.error ?? null)
  }

  const addToCart = async (buyNow = false) => {
    if (needsSize && !selectedSize) {
      setValidationError('Vui lòng chọn kích thước')
      return
    }
    if (!selectedVariant?.active) {
      setValidationError('Vui lòng chọn một phiên bản đang được bán')
      return
    }
    if (selectedVariant.stock <= 0) {
      setValidationError('Hết hàng')
      return
    }

    if (buyNow) {
      if (!currentUser) {
        navigate(ROUTES.login, { state: { from: { pathname: `/products/${encodeURIComponent(product.id)}` }, checkoutLoginRequired: true } })
        return
      }
      const choice = { kind: 'buy-now' as const, variant_id: selectedVariant.id, quantity }
      const started = beginAccountSelection(currentUser.id, choice)
      if (!started) {
        setValidationError('Có yêu cầu đặt hàng trước đó chưa rõ kết quả. Vui lòng kiểm tra đơn trước khi tạo lần mới.')
        return
      }
      navigate(ROUTES.checkout)
      return
    }

    if (commerce.busy) return
    try {
      await commerce.addItem(selectedVariant.id, quantity)
      toast.success(`Đã thêm ${quantity} món vào giỏ`, { label: 'Xem giỏ hàng', onClick: () => navigate(ROUTES.cart) })
      setValidationError(null)
    } catch (failure) {
      setValidationError(guestCartErrorMessage(failure))
    }
  }

  const stockMessage = needsSize && !selectedSize
    ? selection.sizeOptions.some(option => option.stock > 0) ? 'Chọn kích thước để xem tồn kho' : 'Hết hàng'
    : selectedVariant?.stock
      ? `Còn ${selectedVariant.stock} sản phẩm`
      : 'Hết hàng'

  return (
    <main className="bg-[#FAF9F7] pb-12">
      <div className="mx-auto max-w-[var(--container-wide)] px-4 py-5 sm:px-6 md:py-8 lg:px-8">
        <nav aria-label="Đường dẫn" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[#716B66] sm:text-sm">
          <Link to={ROUTES.shop} className="transition hover:text-[#1C1B1B] hover:underline">Cửa hàng</Link>
          {product.categoryName && <><span aria-hidden="true">/</span><span>{product.categoryName}</span></>}
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="max-w-full truncate font-medium text-[#3A3632]">{product.name}</span>
        </nav>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-12 xl:gap-16">
          <ProductGallery images={selection.images} productName={product.name} />

          <section aria-labelledby="product-title" className="grid min-w-0 content-start gap-5 pt-1 lg:sticky lg:top-24">
            <header>
              {product.brand && <p className="text-sm font-medium text-[#68645F]">{product.brand}</p>}
              <h1 id="product-title" className="mt-2 max-w-[24ch] font-sans text-3xl font-semibold leading-[1.18] tracking-[-0.025em] text-[#222222] sm:text-[2.125rem]">{product.name}</h1>
              {product.categoryName && <p className="mt-3 text-sm text-[#716B66]">{product.categoryName}</p>}
              <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-[1.65rem] font-semibold leading-none tracking-[-0.02em] text-[#1C1B1B]">{displayedPrice}</p>
                {needsSize && !selectedSize && <p className="text-xs text-[#716B66]">Giá tùy theo kích thước.</p>}
              </div>
            </header>

            {selection.colorOptions.length > 0 && (
              <ColorSelector options={selection.colorOptions} selectedColor={selection.selectedColor} onChange={handleColorChange} compact />
            )}

            {needsSize && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#33302D]">Kích thước</p>
                  {selectedSize && <p className="text-xs text-[#716B66]">Đã chọn {selectedSize}</p>}
                </div>
                <SizeSelector options={selection.sizeOptions} selectedSize={selectedSize} onChange={handleSizeChange} compact dimOutOfStock />
              </div>
            )}

            {sizeSuggestion && (
              <p className="rounded-md bg-[#F4F2EF] px-3.5 py-2.5 text-[13px] leading-5 text-[#514B46]">{describeSuggestion(sizeSuggestion)}</p>
            )}

            <div className="grid gap-3 border-t border-[#E8E5E1] pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-[#3A3632]">Số lượng</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${hasStockForCurrentSelection ? 'text-[#397B5A]' : 'text-[#A94B4B]'}`}>
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${hasStockForCurrentSelection ? 'bg-[#397B5A]' : 'bg-[#A94B4B]'}`} />
                  {stockMessage}
                </span>
              </div>
              <div className="inline-flex w-fit items-center overflow-hidden rounded-md border border-[#D8D4D0] bg-white">
                <button
                  type="button"
                  aria-label="Giảm số lượng"
                  disabled={!canOrder || quantity <= 1}
                  onClick={() => setQuantity(current => normalizeQuantity(current - 1))}
                  className="grid h-10 w-10 place-items-center text-[#3A3632] transition hover:bg-[#F5F3F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1C1B1B] disabled:cursor-not-allowed disabled:opacity-40"
                ><Minus size={16} aria-hidden="true" /></button>
                <output className="grid h-10 min-w-11 place-items-center border-x border-[#D8D4D0] px-3 text-sm font-semibold text-[#222222]">{quantity}</output>
                <button
                  type="button"
                  aria-label="Tăng số lượng"
                  disabled={!canOrder || !selectedVariant || quantity >= selectedVariant.stock}
                  onClick={() => setQuantity(current => Math.min(selectedVariant?.stock ?? 1, normalizeQuantity(current + 1)))}
                  className="grid h-10 w-10 place-items-center text-[#3A3632] transition hover:bg-[#F5F3F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1C1B1B] disabled:cursor-not-allowed disabled:opacity-40"
                ><Plus size={16} aria-hidden="true" /></button>
              </div>
              {validationError && <p role="alert" className="text-sm font-medium text-[#A94B4B]">{validationError}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" className="!h-12 !min-w-0 !shrink !rounded-md !border !border-[#D6D2CD] !bg-white !px-3 !text-[13px] !text-[#282523] !shadow-none hover:!bg-[#F6F4F1] sm:!text-sm" disabled={!canOrder} loading={commerce.busy} icon={<ShoppingBag size={17} aria-hidden="true" />} onClick={() => void addToCart(false)}>
                Thêm vào giỏ
              </Button>
              <Button className="!h-12 !min-w-0 !shrink !rounded-md !bg-[#1C1B1B] !px-3 !text-[13px] !shadow-none hover:!bg-[#373635] sm:!text-sm" disabled={!canOrder || commerce.busy} icon={<Zap size={17} aria-hidden="true" />} onClick={() => void addToCart(true)}>
                Mua ngay
              </Button>
            </div>
          </section>
        </div>

        {(material || product.description.trim()) && (
          <section aria-labelledby="product-details-title" className="mt-12 border-t border-[#E8E5E1] pt-8 sm:mt-16 sm:pt-10">
            <div className="grid gap-5 md:grid-cols-[minmax(180px,0.32fr)_minmax(0,1fr)] md:gap-10">
              <h2 id="product-details-title" className="font-sans text-xl font-semibold tracking-[-0.015em] text-[#222222]">Thông tin sản phẩm</h2>
              <div className="grid max-w-3xl gap-7">
                {material && (
                  <div>
                    <h3 className="text-sm font-semibold text-[#33302D]">Chất liệu</h3>
                    <p className="mt-1 text-sm leading-6 text-[#625C56]">{material}</p>
                  </div>
                )}
                {product.description.trim() && (
                  <div>
                    <h3 className="text-sm font-semibold text-[#33302D]">Mô tả sản phẩm</h3>
                    <div className="mt-2 grid gap-3 text-sm leading-7 text-[#514B46]">
                      {getDescriptionBlocks(product.description, product.variants.map(variant => variant.size)).map((block, index) => {
                        if (block.type === 'paragraph') {
                          return <p key={`paragraph-${index}`} className="max-w-[72ch] text-pretty">{block.content}</p>
                        }
                        if (block.type === 'field') {
                          return (
                            <div key={`field-${index}`} className="grid max-w-[72ch] gap-1 sm:grid-cols-[minmax(130px,0.3fr)_minmax(0,1fr)] sm:gap-6">
                              <h4 className="text-[13px] font-semibold leading-6 text-[#33302D]">{block.label}</h4>
                              <p className="text-pretty text-[#625C56]">{block.content}</p>
                            </div>
                          )
                        }
                        if (block.type === 'table') {
                          return (
                            <div key={`table-${index}`} className="grid max-w-3xl gap-2">
                              <h4 className="text-[13px] font-semibold leading-6 text-[#33302D]">{block.label}</h4>
                              <div className="overflow-x-auto rounded-md border border-[#E2DEDA]">
                                <table className="w-full min-w-[520px] border-collapse text-left text-[13px] leading-5">
                                  <thead className="bg-[#F4F2EF] text-[#33302D]">
                                    <tr>{block.headers.map((header, headerIndex) => <th key={headerIndex} scope="col" className="px-4 py-3 font-semibold">{header}</th>)}</tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#ECE9E5] bg-white text-[#514B46]">
                                    {block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-2.5">{cell}</td>)}</tr>)}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )
                        }
                        const List = block.ordered ? 'ol' : 'ul'
                        return <List key={`list-${index}`} className={`grid max-w-[72ch] gap-1.5 pl-5 marker:text-[#81786F] ${block.ordered ? 'list-decimal' : 'list-disc'}`}>{block.items.map((item, itemIndex) => <li key={`${index}-${itemIndex}`} className="pl-1 text-pretty">{item}</li>)}</List>
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {relatedProducts.length > 0 && (
        <section aria-labelledby="related-products-title" className="border-t border-[#EAE7E3] bg-white py-10 sm:py-14">
          <div className="mx-auto max-w-[var(--container-wide)] px-4 sm:px-6 lg:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A817A]">{product.categoryName || 'Cửa hàng'}</p>
            <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="related-products-title" className="font-sans text-2xl font-semibold tracking-[-0.02em] text-[#222222] sm:text-3xl">Sản phẩm cùng danh mục</h2>
                <p className="mt-1 text-sm text-[#716B66]">Khám phá thêm lựa chọn trong cửa hàng.</p>
              </div>
              <Link to={ROUTES.shop} className="text-sm font-semibold text-[#3A3632] underline decoration-[#B8B0A8] underline-offset-4 hover:text-[#1C1B1B]">Xem toàn bộ cửa hàng</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map(item => <ProductCard key={item.id} product={item} />)}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
