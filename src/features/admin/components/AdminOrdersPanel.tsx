import {
  ArrowLeft,
  ArrowUpRight,
  CreditCard,
  Eye,
  MapPin,
  Package,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { commerceApi } from "@/api/commerce"
import { projectAdminOrderAttention } from "@/features/admin/model/adminOrderAttention"
import { orderRefundLabel } from "@/features/orders/model/orderRefundStatus"
import type { DemoAction, DemoDatabase } from "@/app/store/types"
import type { Order, OrderStatus } from "@/entities/order/model/types"
import type { ProductVariant } from "@/api/commerce.types"
import {
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/features/admin/model/adminLabels"
import { selectAdminOrders } from "@/features/admin/model/adminSelectors"
import type { AdminOrderFilters } from "@/features/admin/model/adminTypes"
import { identityApi } from "@/shared/api/identityApi"
import { apiMode } from "@/shared/api/http"
import { formatCurrency } from "@/shared/lib/formatCurrency"
import { formatDate } from "@/shared/lib/formatDate"
import { Button, SelectField, TextField, useToast } from "@/shared/ui"
import { AdminPagination, StatusBadge } from "./AdminCommon"

interface AdminOrdersPanelProps {
  database: DemoDatabase
  dispatch: React.Dispatch<DemoAction>
  embedded?: boolean
  onReload?: () => void
  returnStatuses?: ReadonlyMap<string, string>
}

const statusOptions: {
  value: "all" | OrderStatus
  label: string
}[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: orderStatusLabel.pending },
  { value: "payment_pending", label: orderStatusLabel.payment_pending },
  { value: "paid", label: orderStatusLabel.paid },
  { value: "confirmed", label: orderStatusLabel.confirmed },
  { value: "processing", label: orderStatusLabel.processing },
  { value: "shipped", label: orderStatusLabel.shipped },
  { value: "completed", label: orderStatusLabel.completed },
  { value: "cancelled", label: orderStatusLabel.cancelled },
]

const nextStatusMap: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ["confirmed", "cancelled"],
  // PENDING_PAYMENT leaves this state only through the payment itself (QR webhook / COD collection), never by a button.
  payment_pending: ["cancelled"],
  paid: ["processing"],
  confirmed: ["processing"],
  processing: ["shipped"],
  shipped: ["completed"],
}

const actionLabel: Record<OrderStatus, string> = {
  pending: "Xác nhận",
  payment_pending: "Xác nhận thanh toán",
  paid: "Xác nhận thanh toán",
  confirmed: "Xác nhận đơn",
  processing: "Bắt đầu xử lý",
  shipped: "Bắt đầu giao hàng",
  completed: "Hoàn tất đơn",
  cancelled: "Hủy",
}

const commerceStatus: Record<OrderStatus, string> = {
  pending: "PENDING_PAYMENT",
  payment_pending: "PENDING_PAYMENT",
  paid: "PAID",
  confirmed: "PLACED",
  processing: "PROCESSING",
  shipped: "SHIPPED",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
}

function statusTone(status: OrderStatus) {
  if (status === "completed") return "success"
  if (status === "cancelled") return "neutral"
  if (status === "pending" || status === "payment_pending") return "warning"
  return "accent"
}

function nextStatuses(status: OrderStatus) {
  return nextStatusMap[status] ?? []
}

function requiresOrderConfirmation(order: Order | undefined) {
  return (
    order?.confirmationState === "UNCONFIRMED" &&
    ["PLACED", "PAID"].includes(order.backendStatus ?? "")
  )
}

function fullAddress(order: Order) {
  const address = order.shippingAddress
  return [address.line1, address.ward, address.district, address.province]
    .filter(Boolean)
    .join(", ")
}

function OrderItemImage({ src, name }: {
  src: string
  name: string
}) {
  const [failed, setFailed] = useState(false)
  if (!src || failed)
    return (
      <span className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-[#EFEDED] text-xs text-[#5E5F5D]">
        Chưa có ảnh
      </span>
    )
  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className="h-20 w-20 shrink-0 rounded-lg bg-[#EFEDED] object-cover"
    />
  )
}

export function primaryVariantImage(variant: ProductVariant) {
  return [...variant.images]
    .sort(
      (left, right) =>
        Number(right.is_primary) - Number(left.is_primary) ||
        left.display_order - right.display_order,
    )[0]?.image_url ?? ""
}

export function AdminOrdersPanel({
  database,
  dispatch,
  embedded = false,
  onReload,
  returnStatuses,
}: AdminOrdersPanelProps) {
  const toast = useToast()
  const [filters, setFilters] = useState<AdminOrderFilters>({
    query: "",
    status: "all",
    paymentMethod: "all",
  })
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedOrderId = searchParams.get("orderId")
  const detailHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!selectedOrderId) return
    detailHeading.current?.scrollIntoView?.({ block: "start" })
    detailHeading.current?.focus({ preventScroll: true })
  }, [selectedOrderId])
  const [customerEmails, setCustomerEmails] = useState<Map<string, string>>(
    new Map(),
  )
  const [queue, setQueue] = useState("all")
  const [page, setPage] = useState(0)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const pageSize = 15
  const pendingCancellations = new Set(
    database.cancellationRequests
      .filter((request) => request.status === "submitted")
      .map((request) => request.orderId),
  )
  const rows = useMemo(
    () =>
      selectAdminOrders(database, {
        ...filters,
        query: "",
        status: filters.status === "pending" ? "all" : filters.status,
      }).filter((row) => {
        const order = database.orders.find((item) => item.id === row.id)

        const query = filters.query?.trim().toLowerCase() ?? ""

        if (
          query &&
          ![
            row.orderNumber,
            row.id,
            row.customerName,
            customerEmails.get(row.customerId),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
          return false

        if (
          filters.status === "pending" &&
          row.status !== "pending" &&
          !requiresOrderConfirmation(order)
        )
          return false
        if (filters.status === "confirmed" && requiresOrderConfirmation(order))
          return false
        if (
          queue === "confirmation" &&
          row.status !== "pending" &&
          !requiresOrderConfirmation(order)
        )
          return false

        if (queue === "shipping" && row.status !== "shipped") return false

        if (
          queue === "cancellation" &&
          !database.cancellationRequests.some(
            (request) =>
              request.orderId === row.id && request.status === "submitted",
          )
        )
          return false

        if (
          fromDate &&
          new Date(row.createdAt) < new Date(fromDate + "T00:00:00")
        )
          return false

        if (
          toDate &&
          new Date(row.createdAt) > new Date(toDate + "T23:59:59.999")
        )
          return false

        return true
      }),
    [database, filters, customerEmails, queue, fromDate, toDate, returnStatuses],
  )
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / pageSize) - 1),
  )
  const visibleRows = rows.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  )
  const selectedOrder = selectedOrderId
    ? (database.orders.find((order) => order.id === selectedOrderId) ?? null)
    : null
  useEffect(() => {
    if (selectedOrder?.status !== "completed" || selectedOrder.paymentMethod !== "cod" || selectedOrder.paymentStatus === "paid") return
    const timer = window.setInterval(() => onReload?.(), 5000)
    return () => window.clearInterval(timer)
  }, [selectedOrder?.id, selectedOrder?.status, selectedOrder?.paymentMethod, selectedOrder?.paymentStatus, onReload])
  const [variantImages, setVariantImages] = useState<Map<string, string>>(
    new Map(),
  )

  useEffect(() => {
    setVariantImages(new Map())
    if (!selectedOrder || !apiMode()) return

    const variantIds = [
      ...new Set(
        selectedOrder.items
          .filter((item) => !item.imageUrl)
          .map((item) => item.variantId),
      ),
    ]
    if (variantIds.length === 0) return

    let active = true
    void commerceApi.products
      .lookupVariants(variantIds)
      .then(({ items }) => {
        if (!active) return
        setVariantImages(
          new Map(
            items
              .map((variant) => [
                variant.variant_id,
                primaryVariantImage(variant),
              ] as const)
              .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
          ),
        )
      })
      .catch(() => {
        // The order detail remains usable when a product or its image no longer exists.
      })

    return () => {
      active = false
    }
  }, [selectedOrder])
  // The orders API only returns customer_id, so resolve account emails through the admin users API (best effort).
  useEffect(() => {
    if (import.meta.env.MODE === "test") return

    let active = true

    void (async () => {
      const emails = new Map<string, string>()

      try {
        for (let page = 0; page < 20; page++) {
          const result = await identityApi.listUsers({ page, size: 100 })

          result.items.forEach((user) =>
            emails.set(user.account_id, user.email),
          )

          if (page + 1 >= result.total_pages) break
        }
      } catch {
        /* names fall back to the order recipient */
      }

      if (active) setCustomerEmails(emails)
    })()

    return () => {
      active = false
    }
  }, [])
  const openOrderDetail = (orderId: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)

      next.set("section", "orders")

      next.set("orderId", orderId)

      return next
    })
  }
  const closeOrderDetail = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)

      next.delete("orderId")

      return next
    })
  }
  const [confirming, setConfirming] = useState<string | null>(null)
  const confirmOrder = async (orderId: string) => {
    if (confirming) return

    setConfirming(orderId)

    try {
      const result = await commerceApi.orders.confirm(orderId)

      if (result.confirmation_state !== "CONFIRMED")
        throw new Error("Chưa nhận được xác nhận từ máy chủ.")

      toast.success("Đã xác nhận đơn hàng.")

      onReload?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xác nhận đơn hàng.",
      )
    } finally {
      setConfirming(null)
    }
  }
  const [updating, setUpdating] = useState<string | null>(null)
  const changeStatus = async (orderId: string, status: OrderStatus) => {
    if (updating) return

    setUpdating(orderId)

    try {
      const result = await commerceApi.orders.updateStatus(orderId, commerceStatus[status])

      dispatch({
        type: "admin/orderStatusChanged",

        payload: { orderId, status, at: new Date().toISOString() },
      })

      toast.success(result.order_status === "COMPLETED" && result.payment_method === "COD"
        ? "Đã ghi nhận giao hàng. Hệ thống đang cập nhật thanh toán COD."
        : "Đã cập nhật trạng thái đơn hàng.")

      onReload?.()
    } catch (error) {
      toast.error(
        error instanceof Error
            ? error.message
            : "Không thể cập nhật trạng thái đơn hàng",
      )
    } finally {
      setUpdating(null)
    }
  }
  if (selectedOrder) {
    const pendingCancellation = database.cancellationRequests.find(
      request => request.orderId === selectedOrder.id && request.status === "submitted",
    )
    const needsConfirmation = requiresOrderConfirmation(selectedOrder)
    const awaitingPayment = selectedOrder.backendStatus === "PENDING_PAYMENT"
    const next = awaitingPayment
      ? selectedOrder.paymentMethod === "cod"
        ? ["cancelled" as OrderStatus]
        : []
      : nextStatuses(selectedOrder.status)
    const paymentLabel = paymentStatusLabel[selectedOrder.paymentStatus]

    return (
      <section className="space-y-6">
        <button
          type="button"
          onClick={closeOrderDetail}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-secondary hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Quay lại danh sách đơn hàng
        </button>
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-sm text-secondary">
              Đơn hàng · {formatDate(selectedOrder.createdAt)}
            </p>
            <h1
              ref={detailHeading}
              tabIndex={-1}
              className="mt-2 scroll-mt-24 break-words font-display text-3xl font-semibold outline-none"
            >
              {selectedOrder.orderNumber ?? selectedOrder.id}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge
                tone={
                  needsConfirmation
                    ? "warning"
                    : statusTone(selectedOrder.status)
                }
              >
                {needsConfirmation
                  ? "Chờ xác nhận"
                  : orderStatusLabel[selectedOrder.status]}
              </StatusBadge>
              {selectedOrder.refundStatus && (
                <StatusBadge
                  tone={selectedOrder.refundStatus === "PENDING_REFUND" ? "warning" : "success"}
                >
                  {orderRefundLabel(selectedOrder.refundStatus)}
                </StatusBadge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={<RefreshCw size={15} />}
              onClick={onReload}
            >
              Tải lại
            </Button>
            {needsConfirmation ? (
              <Button
                disabled={Boolean(pendingCancellation) || Boolean(confirming) || Boolean(updating)}
                onClick={() => void confirmOrder(selectedOrder.id)}
              >
                Xác nhận đơn
              </Button>
            ) : (
              next.map((status) => (
                <Button
                  key={status}
                  variant={status === "cancelled" ? "danger-soft" : "primary"}
                  disabled={Boolean(pendingCancellation) || Boolean(updating) || Boolean(confirming)}
                  onClick={() => void changeStatus(selectedOrder.id, status)}
                >
                  {status === "completed" &&
                  selectedOrder.paymentMethod === "cod"
                    ? "Đã giao hàng"
                    : actionLabel[status]}
                </Button>
              ))
            )}
          </div>
        </header>
        {pendingCancellation && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-warning-bg p-4 text-sm text-warning-ink">
            <p>Khách hàng đã gửi yêu cầu hủy đang chờ xem xét.</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold underline"
              onClick={() => setSearchParams({
                section: "orders",
                view: "cancellations",
                requestId: pendingCancellation.id,
              })}
            >
              Xem yêu cầu <ArrowUpRight size={15} />
            </button>
          </div>
        )}
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
          <div className="min-w-0 space-y-5">
            <section className="rounded-xl border border-divider bg-white p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-semibold">
                <Package size={18} /> Sản phẩm trong đơn
              </h2>
              {selectedOrder.items.length === 0 ? (
                <p className="mt-5 text-sm text-secondary">
                  Đơn hàng chưa có thông tin sản phẩm.
                </p>
              ) : (
                <div className="mt-5 divide-y divide-divider">
                  {selectedOrder.items.map((item) => (
                    <article
                      key={`${item.productId}-${item.variantId}`}
                      className="flex flex-wrap items-start gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <OrderItemImage
                        key={item.imageUrl || variantImages.get(item.variantId)}
                        src={item.imageUrl || variantImages.get(item.variantId) || ""}
                        name={item.name}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-semibold">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-sm text-secondary">
                          {[item.color, item.size].filter(Boolean).join(" / ")}
                        </p>
                        <p className="mt-2 text-xs text-secondary">
                          Số lượng {item.quantity} · Đơn giá{" "}
                          {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-secondary">Thành tiền</p>
                        <p className="mt-1 text-sm font-semibold tabular-nums">
                          {formatCurrency(
                            item.lineTotal ?? item.unitPrice * item.quantity,
                          )}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <dl className="mt-5 space-y-3 border-t border-divider pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-secondary">Tạm tính</dt>
                  <dd>{formatCurrency(selectedOrder.subtotal)}</dd>
                </div>
                {!!selectedOrder.discount && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-secondary">Giảm giá</dt>
                    <dd>−{formatCurrency(selectedOrder.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-secondary">Phí giao hàng</dt>
                  <dd>{formatCurrency(selectedOrder.shipping)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-divider pt-3 text-base font-semibold">
                  <dt>Tổng tiền</dt>
                  <dd>{formatCurrency(selectedOrder.total)}</dd>
                </div>
                {!!selectedOrder.refundedAmountVnd && (
                  <div className="flex justify-between gap-4 text-success">
                    <dt>Đã hoàn tiền</dt>
                    <dd>{formatCurrency(selectedOrder.refundedAmountVnd)}</dd>
                  </div>
                )}
              </dl>
            </section>
            <section className="rounded-2xl border border-divider bg-white p-5 sm:p-6">
              <h2 className="font-semibold">Lịch sử đơn hàng</h2>
              {selectedOrder.timeline.length ? (
                <ol className="mt-5 space-y-4">
                  {selectedOrder.timeline.map((item) => (
                    <li
                      key={item.id}
                      className="border-l-2 border-divider pl-4 text-sm"
                    >
                      <p className="font-medium">{item.label}</p>
                      <time className="mt-1 block text-xs text-secondary">
                        {formatDate(item.at)}
                      </time>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-sm text-secondary">
                  Chưa có lịch sử trạng thái.
                </p>
              )}
            </section>
          </div>
          <aside className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-divider bg-white p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-semibold">
                <UserRound size={18} /> Khách hàng
              </h2>
              <p className="mt-4 font-medium">
                {selectedOrder.shippingAddress.recipientName}
              </p>
              {customerEmails.get(selectedOrder.userId) && (
                <p className="mt-1 break-all text-sm text-secondary">
                  {customerEmails.get(selectedOrder.userId)}
                </p>
              )}
              <p className="mt-1 text-sm text-secondary">
                {selectedOrder.shippingAddress.phone}
              </p>
              <div className="mt-5 border-t border-divider pt-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin size={16} /> Địa chỉ giao hàng
                </h3>
                <p className="mt-2 break-words text-sm leading-6 text-secondary">
                  {fullAddress(selectedOrder)}
                </p>
              </div>
            </section>
            <section className="rounded-2xl border border-divider bg-white p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-semibold">
                <CreditCard size={18} /> Thanh toán
              </h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-secondary">Phương thức</dt>
                  <dd>{paymentMethodLabel[selectedOrder.paymentMethod]}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-secondary">Trạng thái thu tiền</dt>
                  <dd className="text-right font-medium">{paymentLabel}</dd>
                </div>
                {selectedOrder.refundStatus && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-secondary">Hoàn tiền</dt>
                    <dd className="text-right">
                      {orderRefundLabel(selectedOrder.refundStatus)}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
            <details className="rounded-2xl border border-divider bg-white p-5 text-xs text-secondary">
              <summary className="cursor-pointer font-semibold">
                Mã nội bộ
              </summary>
              <p className="mt-3 break-all">{selectedOrder.id}</p>
            </details>
          </aside>
        </div>
      </section>
    )
  }
  const queues = [
    { value: "all", label: "Tất cả", count: database.orders.length },
    {
      value: "confirmation",
      label: "Chờ xác nhận",
      count: database.orders.filter(
        (order) =>
          order.status === "pending" || requiresOrderConfirmation(order),
      ).length,
    },
    {
      value: "shipping",
      label: "Đang giao",
      count: database.orders.filter((order) => order.status === "shipped")
        .length,
    },
    {
      value: "cancellation",
      label: "Có yêu cầu hủy",
      count: pendingCancellations.size,
    },
  ]
  const resetFilters = () => {
    setFilters({ query: "", status: "all", paymentMethod: "all" })
    setQueue("all")
    setFromDate("")
    setToDate("")
    setPage(0)
  }
  return (
    <section className="min-w-0 space-y-5">
      {!embedded && <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            Quản lý đơn hàng
          </h1>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCw size={15} />}
          onClick={onReload}
        >
          Tải lại
        </Button>
      </header>}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Nhóm đơn hàng"
      >
        {queues.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={queue === item.value}
            onClick={() => {
              setQueue(item.value)
              setPage(0)
            }}
            className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              queue === item.value
                ? "border-charcoal bg-charcoal text-white"
                : "border-divider bg-white text-secondary hover:border-charcoal hover:text-charcoal"
            }`}
          >
            {item.label}
            <span className="rounded-full bg-sand px-1.5 py-0.5 text-[11px] text-charcoal tabular-nums">
              {item.count}
            </span>
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-divider bg-white p-4">
        <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(180px,1.5fr)_minmax(120px,1fr)_minmax(130px,1fr)_140px_140px] [&>label]:min-w-0">
          <label className="grid gap-2 text-sm font-semibold">
            Tìm đơn hàng
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
                aria-hidden="true"
              />
              <input
                value={filters.query ?? ""}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    query: event.target.value,
                  }))
                  setPage(0)
                }}
                placeholder="Mã đơn, tên, email"
                className="h-11 w-full rounded-lg border border-sand-dark bg-white pl-10 pr-3 text-sm font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
              />
            </div>
          </label>
          <SelectField
            className="w-full min-w-0"
            label="Trạng thái"
            value={filters.status ?? "all"}
            onChange={(event) => {
              setFilters((current) => ({
                ...current,
                status: event.target.value as AdminOrderFilters["status"],
              }))
              setPage(0)
            }}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            className="w-full min-w-0"
            label="Thanh toán"
            value={filters.paymentMethod ?? "all"}
            onChange={(event) => {
              setFilters((current) => ({
                ...current,
                paymentMethod: event.target
                  .value as AdminOrderFilters["paymentMethod"],
              }))
              setPage(0)
            }}
          >
            <option value="all">Tất cả</option>
            <option value="cod">COD</option>
            <option value="vietqr">{paymentMethodLabel.vietqr}</option>
            <option value="vnpay">{paymentMethodLabel.vnpay}</option>
          </SelectField>
          <TextField
            className="w-full min-w-0"
            type="date"
            label="Từ ngày"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => {
              setFromDate(event.target.value)
              setPage(0)
            }}
          />
          <TextField
            className="w-full min-w-0"
            type="date"
            label="Đến ngày"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => {
              setToDate(event.target.value)
              setPage(0)
            }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Button size="sm" variant="ghost" onClick={resetFilters}>
            Xóa bộ lọc
          </Button>
          <p className="text-sm text-secondary">
            {rows.length} đơn hàng
          </p>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-divider bg-white">
        <div
          className="overflow-x-auto"
          role="region"
          aria-label="Bảng đơn hàng"
          tabIndex={0}
        >
          <table className="w-full min-w-[940px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[24%]" />
              <col className="w-[15%]" />
              <col className="w-[19%]" />
              <col className="w-[14%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead className="border-b border-divider bg-ivory text-xs font-semibold uppercase tracking-wide text-secondary">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Đơn hàng
                </th>
                <th scope="col" className="px-5 py-4">
                  Khách hàng
                </th>
                <th scope="col" className="px-5 py-4">
                  Thanh toán
                </th>
                <th scope="col" className="px-5 py-4">
                  Trạng thái
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Tổng tiền
                </th>
                <th scope="col" className="px-3 py-4">
                  <span className="sr-only">Chi tiết</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-secondary"
                  >
                    Không có đơn hàng phù hợp.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const order = database.orders.find(
                    (item) => item.id === row.id,
                  )
                  const needsConfirmation = requiresOrderConfirmation(order)
                  const attention = projectAdminOrderAttention({
                    fulfillment: orderStatusLabel[row.status],
                    pendingCancellation: pendingCancellations.has(row.id),
                    returnStatus: returnStatuses?.get(row.id),
                    refundStatus: order?.refundStatus,
                    needsConfirmation,
                  })
                  const paid =
                    row.paymentStatus === "paid"
                  return (
                    <tr
                      key={row.id}
                      className="align-top transition hover:bg-ivory/70"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openOrderDetail(row.id)}
                          className="break-all text-left font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {row.orderNumber}
                        </button>
                        <p className="mt-1.5 text-xs text-secondary">
                          {formatDate(row.createdAt)} · {row.itemCount} sản phẩm
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="break-words font-medium">
                          {row.customerName}
                        </p>
                        {customerEmails.get(row.customerId) && (
                          <p className="mt-1.5 break-all text-xs text-secondary">
                            {customerEmails.get(row.customerId)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {row.paymentMethod === "cod" ? "COD" : paymentMethodLabel[row.paymentMethod]}
                        </p>
                        <p className="mt-1.5 text-xs text-secondary">
                          {paid
                            ? "Đã thu tiền"
                            : row.paymentMethod === "cod" &&
                                row.paymentStatus === "pending"
                              ? "Chưa thu tiền"
                              : paymentStatusLabel[row.paymentStatus]}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          tone={attention.tone}
                        >
                          {attention.label}
                        </StatusBadge>
                        {pendingCancellations.has(row.id) && (
                          <p className="mt-2 text-xs font-semibold text-warning-ink">
                            Yêu cầu hủy chờ duyệt
                          </p>
                        )}
                        {attention.label !== orderStatusLabel[row.status] && (
                          <p className="mt-2 text-xs text-secondary">
                            Giao hàng: {orderStatusLabel[row.status]}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                        {formatCurrency(row.total)}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          aria-label={`Chi tiết đơn ${row.orderNumber}`}
                          onClick={() => openOrderDetail(row.id)}
                          className="grid size-9 place-items-center rounded-lg border border-divider text-secondary hover:bg-sand hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <Eye size={16} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={currentPage}
          pageSize={pageSize}
          total={rows.length}
          onChange={setPage}
        />
      </div>
    </section>
  )
}
