const SESSION_KEY = 'stylemind.community.access'
export const SESSION_EXPIRED = 'stylemind:api-session-expired'
// Paused until the team's real Auth provides the authenticated session.
export const apiMode = () => false

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public retryAfter = 0, public invitationId?: string) { super(message) }
}
export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
export function saveApiSession(token: string, expiresAt: number) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, expiresAt }))
}
export function clearApiSession() { sessionStorage.removeItem(SESSION_KEY) }
export function accessToken(): string | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null')
    return typeof value?.token === 'string' && Number.isFinite(value.expiresAt) && value.expiresAt > Date.now() ? value.token : null
  } catch { return null }
}
function expireSession() { clearApiSession(); window.dispatchEvent(new Event(SESSION_EXPIRED)) }
const messages: Record<string, string> = {
  EMAIL_DELIVERY_UNKNOWN: 'Chưa xác định được kết quả gửi email. Hãy kiểm tra lời mời trước khi thử lại.',
  EMAIL_DELIVERY_FAILED: 'Chưa gửi được email. Bạn có thể chủ động thử lại khi hết thời gian chờ.',
  INVITATION_COOLDOWN: 'Chưa đủ thời gian để gửi lại lời mời.',
  INVITATION_EXPIRED: 'Lời mời đã hết hạn.',
  INVITATION_ALREADY_USED: 'Lời mời đã được sử dụng.',
  INVITATION_INVALIDATED: 'Lời mời này không còn hiệu lực.',
}
function failure(status: number, body: Record<string, unknown>, retryHeader: string | null) {
  const code = typeof body.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(body.code) ? body.code : 'REQUEST_FAILED'
  const retry = Number(body.retry_after_seconds ?? retryHeader ?? 0)
  const message = messages[code] ?? (status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : status === 403 ? 'Tài khoản chưa có quyền thực hiện thao tác này. Kiểm tra email đã xác minh và vai trò tài khoản.' : status === 404 ? 'Không tìm thấy dữ liệu hoặc bạn không có quyền xem.' : status === 409 ? 'Trạng thái đã thay đổi hoặc lời mời đang tồn tại. Hãy tải lại danh sách.' : status === 400 ? 'Thông tin gửi lên chưa hợp lệ.' : status >= 500 ? 'Dịch vụ hiện chưa sẵn sàng. Vui lòng thử lại sau.' : 'Không thể hoàn tất yêu cầu.')
  return new ApiError(status, code, message, Number.isFinite(retry) ? Math.max(0, retry) : 0, isUuid(body.friend_invitation_id) ? body.friend_invitation_id : undefined)
}
export async function apiRequest<T = unknown>(path: string, options: { method?: string; body?: unknown; auth?: boolean; signal?: AbortSignal; responseType?: 'blob' } = {}): Promise<T> {
  if (!/^\/(identity|wardrobe-community)\/api\/v1\//.test(path) || path.includes('://') || path.includes('\\')) throw new ApiError(0, 'INVALID_PATH', 'Đường dẫn API không hợp lệ.')
  const headers: Record<string, string> = { Accept: 'application/json, application/problem+json' }
  let requestToken: string | null = null
  if (options.auth !== false) {
    const token = accessToken()
    if (!token) { expireSession(); throw failure(401, {}, null) }
    requestToken = token
    headers.Authorization = `Bearer ${token}`
  }
  const multipart = options.body instanceof FormData
  if (options.body !== undefined && !multipart) headers['Content-Type'] = 'application/json'
  let response: Response
  try {
    response = await fetch(path, { method: options.method ?? 'GET', headers, body: options.body === undefined ? undefined : multipart ? options.body as FormData : JSON.stringify(options.body), credentials: 'omit', cache: 'no-store', signal: options.signal, redirect: 'error' })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new ApiError(0, 'NETWORK_UNAVAILABLE', 'Không kết nối được Gateway. Kiểm tra backend đang chạy và thử lại.')
  }
  if (response.status === 204 && response.ok) return undefined as T
  if (response.ok && options.responseType === 'blob') return await response.blob() as T
  let body: unknown
  try { body = await response.json() } catch { body = null }
  if (!response.ok) {
    if (response.status === 401 && requestToken && (!accessToken() || accessToken() === requestToken)) expireSession()
    throw failure(response.status, body && typeof body === 'object' ? body as Record<string, unknown> : {}, response.headers.get('Retry-After'))
  }
  if (!body || typeof body !== 'object') throw new ApiError(502, 'INVALID_RESPONSE', 'Phản hồi API không hợp lệ.')
  return body as T
}
