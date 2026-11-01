const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

/**
 * Commerce returns either an absolute URL (Cloudinary) or a path relative to the Commerce service.
 * Relative paths go through the gateway under /commerce; absolute URLs are used as they are.
 */
export function commerceImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${API_BASE_URL}/commerce${url}`
  return url
}
