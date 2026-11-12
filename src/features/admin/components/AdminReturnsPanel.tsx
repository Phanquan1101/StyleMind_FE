import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Eye, RefreshCw, Search } from "lucide-react"
import { Button, Modal, SelectField } from "@/shared/ui"
import { AdminPagination } from "./AdminCommon"
import { formatCurrency } from "@/shared/lib/formatCurrency"
import RefundPanel from "@/features/returns/RefundPanel"
import ReturnDetails, {
  ReturnStatusBadge,
} from "@/features/returns/ReturnDetails"
import {
  flowErrorMessage,
  normalizeReason,
  returnReasonLimit,
  returnsApi,
  returnStatusLabels,
  type ReturnAction,
  type ReturnPage,
  type ReturnRequest,
} from "@/features/returns/returnsApi"

const actions = {
  REQUEST_IMAGES: {
    label: "Yêu cầu thêm ảnh",
    confirm: "Xác nhận yêu cầu thêm ảnh",
    reasonRequired: true,
  },
  APPROVE_PICKUP: {
    label: "Duyệt lấy hàng",
    confirm: "Xác nhận duyệt lấy hàng",
    reasonRequired: false,
  },
  REJECT: {
    label: "Từ chối trả hàng",
    confirm: "Xác nhận từ chối trả hàng",
    reasonRequired: true,
  },
  PASS_INSPECTION: {
    label: "Kiểm định đạt",
    confirm: "Xác nhận kiểm định đạt",
    reasonRequired: false,
  },
  FAIL_INSPECTION: {
    label: "Kiểm định không đạt",
    confirm: "Xác nhận kiểm định không đạt",
    reasonRequired: true,
  },
} satisfies Record<ReturnAction, {
  label: string
  confirm: string
  reasonRequired: boolean
}>

function availableActions(status: ReturnRequest["status"]): ReturnAction[] {
  switch (status) {
    case "REQUESTED":
      return ["APPROVE_PICKUP", "REQUEST_IMAGES", "REJECT"]
    case "PICKUP_APPROVED":
      return ["PASS_INSPECTION", "FAIL_INSPECTION"]
    default:
      return []
  }
}

function ReturnReview({
  request,
  onUpdated,
}: {
  request: ReturnRequest
  onUpdated: (request: ReturnRequest) => void
}) {
  const [decision, setDecision] = useState<ReturnAction | null>(null)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const allowed = availableActions(request.status)
  const action =
    decision && allowed.includes(decision) ? actions[decision] : null
  const showRefund =
    request.status === "PENDING_REFUND" || request.status === "REFUNDED"
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      locked.current ||
      !decision ||
      !action ||
      (action.reasonRequired && !normalizeReason(reason))
    )
      return
    locked.current = true
    setBusy(true)
    setError("")
    try {
      onUpdated(
        await returnsApi.decide(
          request.return_id,
          decision,
          normalizeReason(reason),
        ),
      )
      setDecision(null)
      setReason("")
    } catch (failure) {
      setError(flowErrorMessage(failure, "Không thể xử lý yêu cầu trả hàng."))
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  return (
    <article className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-divider pb-4">
        <div className="min-w-0">
          <p className="text-xs text-secondary">Đơn hàng</p>
          <h3 className="font-semibold">
            <Link
              to={
                "/admin?section=orders&orderId=" +
                encodeURIComponent(request.order_id)
              }
              className="break-words text-accent underline-offset-2 hover:underline"
            >
              {request.order_number || request.order_id}
            </Link>
          </h3>
          <time
            className="mt-1 block text-xs text-secondary"
            dateTime={request.created_at}
          >
            {new Date(request.created_at).toLocaleString("vi-VN")}
          </time>
        </div>
        <ReturnStatusBadge status={request.status} />
      </header>
      <div
        className={
          showRefund
            ? undefined
            : "grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(230px,0.52fr)]"
        }
      >
        <ReturnDetails request={request} />
        {!showRefund && (
          <div className="min-w-0 space-y-3 self-start rounded-xl border border-divider bg-ivory p-4">
            <p className="text-sm text-secondary">Giá trị hàng trả</p>
            <p className="text-xl font-semibold tabular-nums">
              {formatCurrency(request.amount_vnd)}
            </p>
            {allowed.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-divider pt-3">
                {allowed.map((key) => (
                  <Button
                    type="button"
                    size="sm"
                    variant={key === allowed[0] ? "primary" : "secondary"}
                    key={key}
                    aria-expanded={decision === key}
                    disabled={busy}
                    onClick={() => {
                      setDecision(key)
                      setReason("")
                      setError("")
                    }}
                  >
                    {actions[key].label}
                  </Button>
                ))}
              </div>
            )}
            {request.status === "MORE_IMAGES_REQUESTED" && (
              <p className="text-sm text-secondary">
                Đang chờ khách gửi thêm ảnh.
              </p>
            )}
          </div>
        )}
      </div>
      {action && (
        <form
          className="grid gap-3 rounded-xl border border-divider bg-ivory p-4"
          onSubmit={submit}
        >
          <h4 className="font-semibold">{action.label}</h4>
          <label className="grid gap-2 text-sm font-semibold">
            {action.reasonRequired ? "Lý do" : "Ghi chú (tùy chọn)"}
            <textarea
              className="min-h-20 rounded-lg border border-[#E3E2E2] bg-white px-3 py-2 font-normal"
              value={reason}
              maxLength={returnReasonLimit}
              required={action.reasonRequired}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={
                busy || (action.reasonRequired && !normalizeReason(reason))
              }
            >
              {busy ? "Đang cập nhật…" : action.confirm}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => setDecision(null)}
            >
              Đóng
            </Button>
          </div>
        </form>
      )}
      {showRefund && (
        <RefundPanel source="RETURN" sourceId={request.return_id} admin />
      )}
    </article>
  )
}

export default function AdminReturnsPanel() {
  const [data, setData] = useState<ReturnPage | null>(null)
  const [page, setPage] = useState(0)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pageSize = 15
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError("")
    void (async () => {
      try {
        const first = await returnsApi.adminList(0, controller.signal)
        const items = [...first.items]
        for (let index = 1; index < first.total_pages; index++) {
          if (controller.signal.aborted) return
          const next = await returnsApi.adminList(index, controller.signal)
          items.push(...next.items)
        }
        if (!controller.signal.aborted)
          setData({
            ...first,
            items: [
              ...new Map(items.map((item) => [item.return_id, item])).values(),
            ],
          })
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(flowErrorMessage(failure, "Không thể tải yêu cầu trả hàng."))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [reload])
  function updateRequest(request: ReturnRequest) {
    setData((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.return_id === request.return_id ? request : item,
            ),
          }
        : current,
    )
  }
  const records = data?.items ?? []
  const filtered = records.filter(
    (request) =>
      (!status || request.status === status) &&
      [
        request.order_number,
        request.order_id,
        request.return_id,
        request.reason,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  )
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / pageSize) - 1),
  )
  const selected = records.find((request) => request.return_id === selectedId)
  const queues = [
    { value: "", label: "Tất cả" },
    { value: "REQUESTED", label: "Chờ duyệt" },
    { value: "PICKUP_APPROVED", label: "Chờ lấy hàng" },
    { value: "PENDING_REFUND", label: "Chờ hoàn tiền" },
    { value: "REFUNDED", label: "Đã hoàn tiền" },
  ]
  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider">
        <div
          className="flex gap-1 overflow-x-auto min-w-0"
          role="group"
          aria-label="Nhóm trả hàng"
        >
          {queues.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={status === item.value}
              onClick={() => {
                setStatus(item.value)
                setPage(0)
              }}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold ${
                status === item.value
                  ? "border-accent text-accent"
                  : "border-transparent text-secondary hover:text-accent"
              }`}
            >
              {item.label}
              <span className="ml-2 text-xs tabular-nums">
                {
                  records.filter(
                    (request) => !item.value || request.status === item.value,
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={loading}
          onClick={() => setReload((value) => value + 1)}
          icon={<RefreshCw size={15} />}
        >
          Tải lại yêu cầu
        </Button>
      </div>
      <div className="grid items-end gap-3 rounded-2xl border border-divider bg-white p-4 md:grid-cols-[minmax(0,1fr)_230px_auto] [&>label]:min-w-0">
        <label className="grid gap-2 text-sm font-semibold">
          Tìm yêu cầu
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
              placeholder="Mã đơn, mã yêu cầu hoặc lý do"
              className="h-11 w-full rounded-lg border border-sand-dark pl-10 pr-3 text-sm font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
            />
          </div>
        </label>
        <SelectField
          className="w-full min-w-0"
          label="Trạng thái trả hàng"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(0)
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(returnStatusLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
        <Button
          variant="ghost"
          onClick={() => {
            setQuery("")
            setStatus("")
            setPage(0)
          }}
        >
          Xóa bộ lọc
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-error-bg p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-divider bg-white">
        <div
          className="overflow-x-auto"
          role="region"
          aria-label="Bảng yêu cầu trả hàng"
          aria-busy={loading}
          tabIndex={0}
        >
          <table className="w-full min-w-[900px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[29%]" />
              <col className="w-[14%]" />
              <col className="w-[15%]" />
              <col className="w-[16%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead className="border-b border-divider bg-ivory text-xs uppercase tracking-wide text-secondary">
              <tr>
                <th scope="col" className="px-5 py-4">
                  Đơn hàng
                </th>
                <th scope="col" className="px-5 py-4">
                  Yêu cầu trả hàng
                </th>
                <th scope="col" className="px-5 py-4">
                  Ngày gửi
                </th>
                <th scope="col" className="px-5 py-4 text-right">
                  Giá trị trả
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
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-secondary"
                  >
                    Đang tải yêu cầu trả hàng…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-secondary"
                  >
                    Hãy tải lại để xem danh sách yêu cầu.
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-secondary"
                  >
                    Không có yêu cầu trả hàng phù hợp.
                  </td>
                </tr>
              ) : (
                filtered
                  .slice(currentPage * pageSize, (currentPage + 1) * pageSize)
                  .map((request) => (
                    <tr
                      key={request.return_id}
                      className="align-top transition hover:bg-ivory/70"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedId(request.return_id)}
                          className="break-all text-left font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {request.order_number || request.order_id}
                        </button>
                        <p className="mt-1.5 text-xs text-secondary">
                          {request.items.length} dòng sản phẩm
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="line-clamp-2 break-words text-secondary">
                          {request.reason}
                        </p>
                        <p
                          className="mt-1.5 text-xs text-secondary"
                          title={request.return_id}
                        >
                          #{request.return_id.slice(0, 8)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs text-secondary">
                        {new Date(request.created_at).toLocaleDateString(
                          "vi-VN",
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums">
                        {formatCurrency(request.amount_vnd)}
                      </td>
                      <td className="px-5 py-4">
                        <ReturnStatusBadge status={request.status} compact />
                      </td>
                      <td className="px-2 py-4">
                        <button
                          type="button"
                          aria-label={`Xem yêu cầu ${request.order_number || request.return_id}`}
                          onClick={() => setSelectedId(request.return_id)}
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
        {!loading && !error && (
          <AdminPagination
            page={currentPage}
            pageSize={pageSize}
            total={filtered.length}
            onChange={setPage}
          />
        )}
      </div>
      <Modal
        open={Boolean(selected)}
        layout="drawer"
        title={`Trả hàng · ${selected?.order_number || ""}`}
        description="Xem sản phẩm, bằng chứng và xử lý yêu cầu trả hàng."
        onClose={() => setSelectedId(null)}
      >
        {selected && (
          <ReturnReview
            key={selected.return_id}
            request={selected}
            onUpdated={updateRequest}
          />
        )}
      </Modal>
    </section>
  )
}
