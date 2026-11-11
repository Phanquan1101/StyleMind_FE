export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
/** Server limit per image (commerce multipart + validator). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
/** Photos larger than this are re-encoded before upload even when they fit the limit. */
const COMPRESS_ABOVE_BYTES = 1.5 * 1024 * 1024
const MAX_EDGE_PX = 1600

/** Returns a Vietnamese message when the file cannot be uploaded, otherwise null. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Ảnh phải là JPG, PNG hoặc WebP.'
  if (file.size > MAX_IMAGE_BYTES * 3) return 'Ảnh quá lớn (tối đa 30 MB trước khi nén). Hãy chọn ảnh nhỏ hơn.'
  return null
}

function loadBitmap(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void } | null> {
  if (typeof document === 'undefined') return Promise.resolve(null)
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: image.naturalWidth, height: image.naturalHeight, draw: (ctx, w, h) => ctx.drawImage(image, 0, 0, w, h) })
    }
    image.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    image.src = url
  })
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), type, quality))
}

/**
 * Shrinks large photos (longest edge ~1600px) and re-encodes them as WebP/JPEG so uploads stay small and fast.
 * Falls back to the original file whenever the browser cannot process it (the server still validates the size).
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  try {
    const bitmap = await loadBitmap(file)
    if (!bitmap || !bitmap.width || !bitmap.height) return file
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= COMPRESS_ABOVE_BYTES) return file

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    bitmap.draw(ctx, canvas.width, canvas.height)

    let blob = await toBlob(canvas, 'image/webp', 0.85)
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.85)
    if (!blob || blob.size >= file.size) return file
    const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'image'}.${extension}`, { type: blob.type })
  } catch {
    return file
  }
}
