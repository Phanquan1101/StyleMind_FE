import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Eye, RefreshCw, Search } from "lucide-react"
import RefundPanel from "@/features/returns/RefundPanel"
import AdminReturnsPanel from "./AdminReturnsPanel"
import type { ReturnRequest as ApiReturnRequest } from "@/features/returns/returnsApi"
import { commerceApi } from "@/api/commerce"
import type { DemoAction, DemoDatabase } from "@/app/store/types"
import type {
  CancellationRequest,
  ReturnRequest,
} from "@/entities/order/model/types"
import {
  cancellationStatusLabel,
  returnStatusLabel,
} from "@/features/admin/model/adminLabels"
import { Button, Modal, SelectField, useToast } from "@/shared/ui"
import { apiMode } from "@/shared/api/http"
import { formatDate } from "@/shared/lib/formatDate"
import { AdminPagination, StatusBadge } from "./AdminCommon"

interface AdminRequestsPanelProps {
  database: DemoDatabase
  dispatch: React.Dispatch<DemoAction>
  reviewerId: string
  onReload?: () => void
  embeddedView?: "cancellations" | "returns"
  onReturnUpdated?: (request: ApiReturnRequest) => void
}

type RequestTab = "cancellations" | "returns"

function customerName(database: DemoDatabase, userId: string, orderId?: string) {
  return database.users.find(user => user.id === userId)?.fullName
    || database.orders?.find(order => order.id === orderId)?.shippingAddress.recipientName
    || 'Khách hàng'
}

function statusTone(
  status: CancellationRequest["status"] | ReturnRequest["status"],
) {
  if (status === "approved" || status === "refunded") return "success"
  if (status === "rejected") return "danger"
  return "warning"
}

function orderAdminHref(orderId: string) {
  return `/admin?section=orders&orderId=${encodeURIComponent(orderId)}`
}

function compactId(id: string) {
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id
}

export function AdminRequestsPanel({
  database,
  dispatch,
  reviewerId,
  onReload,
  embeddedView,
  onReturnUpdated,
}: AdminRequestsPanelProps) {
  const toast = useToast()
  const [selectedTab, setActiveTab] = useState<RequestTab>("cancellations")
  const activeTab = embeddedView ?? selectedTab
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [reviewing, setReviewing] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get("requestId")
  const setSelectedId = (requestId: string | null) => {
    setSearchParams(current => {
      const next = new URLSearchParams(current)
      if (requestId) next.set("requestId", requestId)
      else next.delete("requestId")
      return next
    })
  }
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(0)
  const pageSize = 15
  const cancellations = useMemo(
    () =>
      [...database.cancellationRequests].sort((first, second) =>
        second.createdAt.localeCompare(first.createdAt),
      ),
    [database.cancellationRequests],
  )
  const returns = useMemo(
    () =>
      [...database.returnRequests].sort((first, second) =>
        second.createdAt.localeCompare(first.createdAt),
      ),
    [database.returnRequests],
  )
  const orderCode = (orderId: string) =>
    database.orders?.find((order) => order.id === orderId)?.orderNumber ||
    compactId(orderId)
  const filtered = cancellations.filter(
    (request) =>
      (status === "all" || request.status === status) &&
      [
        request.id,
        request.orderId,
        orderCode(request.orderId),
        request.reason,
        customerName(database, request.userId, request.orderId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  )
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / pageSize) - 1),
  )
  const selected = cancellations.find((request) => request.id === selectedId)
  const reviewCancellation = async (
    requestId: string,
    decision: "approved" | "rejected",
  ) => {
    if (reviewing || (decision === "rejected" && !rejectReason.trim())) return
    setReviewing(true)
    try {
      const result = await commerceApi.orders.reviewCancellation(
        requestId,
        decision === "approved" ? "APPROVED" : "REJECTED",
        decision === "rejected" ? rejectReason.trim() : null,
      )
      if (
        result.request_status !==
        (decision === "approved" ? "APPROVED" : "REJECTED")
      ) {
        throw new Error("Chưa nhận được kết quả xử lý từ máy chủ.")
      }
      setRejecting(null)
      setRejectReason("")
      dispatch({
        type: "admin/cancellationReviewed",
        payload: {
          requestId,
          decision,
          reviewerId,
          reviewedAt: new Date().toISOString(),
          note: result.decision_reason ?? undefined,
          refundStatus: result.refund_status ?? undefined,
        },
      })
      toast.success(
        result.refund_status === "PENDING_REFUND"
          ? "Đã duyệt hủy đơn. Đã ghi nhận khoản chờ hoàn tiền."
          : decision === "approved"
            ? "Đã duyệt yêu cầu hủy."
            : "Đã từ chối yêu cầu hủy.",
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xử lý yêu cầu hủy",
      )
    } finally {
      setReviewing(false)
    }
  }
  const reviewReturn = (
    requestId: string,
    decision: "approved" | "rejected" | "refunded",
  ) => {
    dispatch({
      type: "admin/returnReviewed",
      payload: {
        requestId,
        decision,
        reviewerId,
        reviewedAt: new Date().toISOString(),
      },
    })
    toast.success(
      decision === "refunded"
        ? "Đã hoàn tiền yêu cầu đổi/trả."
        : "Đã cập nhật yêu cầu đổi/trả.",
    )
  }
  return (
    <section className="min-w-0 space-y-5">
      {!embeddedView && <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            Quản lý yêu cầu
          </h1>
        </div>
        {activeTab === "cancellations" && (
          <Button
            variant="secondary"
            icon={<RefreshCw size={15} />}
            onClick={onReload}
          >
            Tải lại
          </Button>
        )}
      </header>}
      {embeddedView === "cancellations" && <div className="flex justify-end"><Button variant="secondary" icon={<RefreshCw size={15} />} onClick={onReload}>Tải lại yêu cầu</Button></div>}
      {!embeddedView && <div
        className="flex gap-1 overflow-x-auto border-b border-divider"
        role="group"
        aria-label="Loại yêu cầu"
      >
        <button
          type="button"
          aria-label="Hủy đơn"
          aria-pressed={activeTab === "cancellations"}
          onClick={() => setActiveTab("cancellations")}
          className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === "cancellations"
              ? "border-accent text-accent"
              : "border-transparent text-secondary hover:text-accent"
          }`}
        >
          Hủy đơn{" "}
          <span className="ml-2 rounded-md bg-sand px-1.5 py-0.5 text-xs">
            {
              cancellations.filter((request) => request.status === "submitted")
                .length
            }
          </span>
        </button>
        <button
          type="button"
          aria-pressed={activeTab === "returns"}
          onClick={() => setActiveTab("returns")}
          className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === "returns"
              ? "border-accent text-accent"
              : "border-transparent text-secondary hover:text-accent"
          }`}
        >
          Trả hàng / Hoàn tiền
        </button>
      </div>}
      {activeTab === "returns" && apiMode() ? (
        <AdminReturnsPanel onChanged={onReturnUpdated} />
      ) : activeTab === "cancellations" ? (
        <>
          <div className="grid items-end gap-3 rounded-2xl border border-divider bg-white p-4 md:grid-cols-[minmax(0,1fr)_220px_auto] [&>label]:min-w-0">
            <label className="grid gap-2 text-sm font-semibold">
              Tìm yêu cầu hủy
              <div className="relative">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
                />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(0)
                  }}
                  placeholder="Mã đơn, khách hàng hoặc lý do"
                  className="h-11 w-full rounded-lg border border-sand-dark pl-10 pr-3 text-sm font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                />
              </div>
            </label>
            <SelectField
              className="w-full min-w-0"
              label="Trạng thái yêu cầu"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(0)
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="submitted">Đang chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Đã từ chối</option>
            </SelectField>
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("")
                setStatus("all")
                setPage(0)
              }}
            >
              Xóa bộ lọc
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-divider bg-white">
            <div
              className="overflow-x-auto"
              role="region"
              aria-label="Bảng yêu cầu hủy đơn"
              tabIndex={0}
            >
              <table className="w-full min-w-[900px] table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[18%]" />
                  <col className="w-[25%]" />
                  <col className="w-[13%]" />
                  <col className="w-[16%]" />
                  <col className="w-[6%]" />
                </colgroup>
                <thead className="border-b border-divider bg-ivory text-xs uppercase tracking-wide text-secondary">
                  <tr>
                    <th scope="col" className="px-5 py-4">
                      Đơn hàng
                    </th>
                    <th scope="col" className="px-5 py-4">
                      Khách hàng
                    </th>
                    <th scope="col" className="px-5 py-4">
                      Lý do hủy
                    </th>
                    <th scope="col" className="px-5 py-4">
                      Ngày gửi
                    </th>
                    <th scope="col" className="px-5 py-4">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-3 py-4">
                      <span className="sr-only">Chi tiết</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-secondary"
                      >
                        Không có yêu cầu hủy phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filtered
                      .slice(
                        currentPage * pageSize,
                        (currentPage + 1) * pageSize,
                      )
                      .map((request) => (
                        <tr
                          key={request.id}
                          className="align-top transition hover:bg-ivory/70"
                        >
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(request.id)
                                setRejecting(null)
                              }}
                              className="break-all text-left font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-accent"
                            >
                              {orderCode(request.orderId)}
                            </button>
                            <p
                              title={request.id}
                              className="mt-1.5 text-xs text-secondary"
                            >
                              {compactId(request.id)}
                            </p>
                          </td>
                          <td className="break-words px-5 py-4">
                            {customerName(database, request.userId, request.orderId)}
                          </td>
                          <td className="px-5 py-4">
                            <p className="line-clamp-2 break-words text-secondary">
                              {request.reason}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-xs text-secondary">
                            {formatDate(request.createdAt)}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge tone={statusTone(request.status)}>
                              {request.status === "submitted" ? "Chờ duyệt" : cancellationStatusLabel[request.status]}
                            </StatusBadge>
                            {request.refundStatus && (
                              <p className="mt-2 text-xs text-secondary">
                                {request.refundStatus === "REFUNDED"
                                  ? "Đã hoàn tiền"
                                  : "Chờ hoàn tiền"}
                              </p>
                            )}
                          </td>
                          <td className="px-2 py-4">
                            <button
                              type="button"
                              aria-label={`Xem yêu cầu hủy ${request.id}`}
                              onClick={() => {
                                setSelectedId(request.id)
                                setRejecting(null)
                              }}
                              className="grid size-9 place-items-center rounded-lg border border-divider text-secondary hover:bg-sand focus-visible:ring-2 focus-visible:ring-accent"
                            >
                              <Eye size={16} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={currentPage}
              pageSize={pageSize}
              total={filtered.length}
              onChange={setPage}
            />
          </div>
        </>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#E3E2E2] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <thead className="bg-[#FBF9F9] text-xs font-semibold uppercase tracking-wide text-[#5E5F5D]">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Yêu cầu
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Đơn hàng
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Khách hàng
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Ngày gửi
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Lý do
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D8]">
                {returns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-[#5E5F5D]"
                    >
                      Chưa có yêu cầu đổi/trả.
                    </td>
                  </tr>
                ) : (
                  returns.map((request) => (
                    <tr
                      key={request.id}
                      className="align-middle hover:bg-[#FBF9F9]/70"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-semibold text-[#222222]">
                          {request.id}
                        </p>
                        <p className="mt-0.5 text-xs text-[#5E5F5D]">
                          {request.items.length} sản phẩm
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          to={orderAdminHref(request.orderId)}
                          className="font-semibold text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {request.orderId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#3A3632]">
                        {customerName(database, request.userId, request.orderId)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#5E5F5D]">
                        {formatDate(request.createdAt)}
                      </td>
                      <td className="max-w-[18rem] px-4 py-3">
                        <blockquote className="rounded-r-md border-l-2 border-[#C4C7C7] bg-[#F5F2EE] px-3 py-2 leading-5 text-[#3A3632]">
                          {request.reason}
                        </blockquote>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={statusTone(request.status)}>
                          {returnStatusLabel[request.status]}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {request.status === "submitted" ||
                          request.status === "reviewing" ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  reviewReturn(request.id, "approved")
                                }
                              >
                                Duyệt đổi/trả
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="danger-soft"
                                onClick={() =>
                                  reviewReturn(request.id, "rejected")
                                }
                              >
                                Từ chối
                              </Button>
                            </>
                          ) : request.status === "approved" ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                reviewReturn(request.id, "refunded")
                              }
                            >
                              Hoàn tiền
                            </Button>
                          ) : (
                            <span className="whitespace-nowrap text-xs font-medium text-[#5E5F5D]">
                              Đã xử lý
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal
        open={Boolean(selected)}
        layout="drawer"
        title={`Yêu cầu hủy · ${selected ? orderCode(selected.orderId) : ""}`}
        description="Kiểm tra thông tin đơn và lý do trước khi xử lý yêu cầu."
        onClose={() => {
          if (!reviewing) {
            setSelectedId(null)
            setRejecting(null)
            setRejectReason("")
          }
        }}
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge tone={statusTone(selected.status)}>
                {selected.status === "submitted" ? "Chờ duyệt" : cancellationStatusLabel[selected.status]}
              </StatusBadge>
              <Link
                to={orderAdminHref(selected.orderId)}
                className="text-sm font-semibold underline"
              >
                Xem đơn hàng
              </Link>
            </div>
            <dl className="grid gap-4 rounded-xl border border-divider bg-ivory p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-secondary">Khách hàng</dt>
                <dd className="mt-1 font-medium">
                  {customerName(database, selected.userId, selected.orderId)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-secondary">Ngày gửi</dt>
                <dd className="mt-1">{formatDate(selected.createdAt)}</dd>
              </div>
            </dl>
            <section className="rounded-xl border border-divider p-4">
              <h3 className="text-sm font-semibold">Lý do hủy đơn</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-secondary">
                {selected.reason}
              </p>
            </section>
            {selected.adminNote && (
              <section className="rounded-xl bg-ivory p-4 text-sm">
                <h3 className="font-semibold">Phản hồi của cửa hàng</h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-secondary">
                  {selected.adminNote}
                </p>
              </section>
            )}
            {selected.status === "submitted" && (
              <div className="space-y-4 rounded-xl border border-divider p-4">
                {rejecting === selected.id ? (
                  <>
                    <label className="grid gap-2 text-sm font-semibold">
                      Lý do từ chối
                      <textarea
                        autoFocus
                        rows={3}
                        value={rejectReason}
                        onChange={(event) =>
                          setRejectReason(event.target.value)
                        }
                        maxLength={500}
                        placeholder="Nhập lý do để thông báo cho khách hàng…"
                        className="w-full rounded-lg border border-sand-dark bg-white p-3 font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={reviewing || !rejectReason.trim()}
                        onClick={() =>
                          void reviewCancellation(selected.id, "rejected")
                        }
                      >
                        Xác nhận từ chối
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={reviewing}
                        onClick={() => setRejecting(null)}
                      >
                        Đóng
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={reviewing}
                      onClick={() =>
                        void reviewCancellation(selected.id, "approved")
                      }
                    >
                      Duyệt yêu cầu
                    </Button>
                    <Button
                      size="sm"
                      variant="danger-soft"
                      disabled={reviewing}
                      onClick={() => {
                        setRejecting(selected.id)
                        setRejectReason("")
                      }}
                    >
                      Từ chối
                    </Button>
                  </div>
                )}
              </div>
            )}
            {apiMode() &&
              selected.status === "approved" &&
              selected.refundStatus && (
                <RefundPanel
                  key={selected.id}
                  source="CANCELLATION"
                  sourceId={selected.id}
                  admin
                />
              )}
            <details className="rounded-xl border border-divider p-4 text-xs text-secondary">
              <summary className="cursor-pointer font-semibold">
                Mã đầy đủ
              </summary>
              <dl className="mt-3 space-y-3">
                <div>
                  <dt>Mã yêu cầu</dt>
                  <dd className="mt-1 break-all">{selected.id}</dd>
                </div>
                <div>
                  <dt>Mã đơn hàng</dt>
                  <dd className="mt-1 break-all">{selected.orderId}</dd>
                </div>
              </dl>
            </details>
          </div>
        )}
      </Modal>
    </section>
  )
}
