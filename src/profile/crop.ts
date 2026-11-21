/**
 * Crop maths (pure, unit-tested) + canvas helpers.
 *
 * A crop is stored independently of screen size:
 *   zoom ≥ 1  — 1 means the image just covers the square frame
 *   x, y      — offset of the image centre from the frame centre, as a
 *               fraction of the frame size
 */
export interface Crop {
  x: number
  y: number
  zoom: number
}

export const DEFAULT_CROP: Crop = { x: 0, y: 0, zoom: 1 }
export const MIN_ZOOM = 1
export const MAX_ZOOM = 4
/** stored original is downscaled to this (also strips EXIF/GPS metadata) */
export const MAX_ORIGINAL = 1280
/** size of the rendered face square */
export const FACE_SIZE = 384

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Where the image is drawn inside a frame of `frame` px for a given crop. */
export function drawRect(imgW: number, imgH: number, crop: Crop, frame: number): Rect {
  const cover = Math.max(frame / imgW, frame / imgH)
  const s = cover * crop.zoom
  const w = imgW * s
  const h = imgH * s
  return { x: frame / 2 - w / 2 + crop.x * frame, y: frame / 2 - h / 2 + crop.y * frame, w, h }
}

/** Keep the image covering the whole frame (no empty corners). */
export function clampCrop(imgW: number, imgH: number, crop: Crop): Crop {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(crop.zoom) ? crop.zoom : 1))
  const r = drawRect(imgW, imgH, { x: 0, y: 0, zoom }, 1)
  const maxX = Math.max(0, (r.w - 1) / 2)
  const maxY = Math.max(0, (r.h - 1) / 2)
  const cl = (v: number, m: number) => Math.min(m, Math.max(-m, Number.isFinite(v) ? v : 0))
  return { x: cl(crop.x, maxX), y: cl(crop.y, maxY), zoom }
}

/** Zoom around the frame centre, keeping the same point centred. */
export function zoomTo(imgW: number, imgH: number, crop: Crop, zoom: number): Crop {
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
  const k = z / crop.zoom
  return clampCrop(imgW, imgH, { x: crop.x * k, y: crop.y * k, zoom: z })
}

export function scaleToFit(w: number, h: number, max: number): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h))
  return { w: Math.round(w * k), h: Math.round(h * k) }
}

// ── canvas helpers (browser only) ───────────────────────────────────────

export function loadImage(src: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = typeof src === 'string' ? src : URL.createObjectURL(src)
    const img = new Image()
    img.onload = () => {
      if (typeof src !== 'string') URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      if (typeof src !== 'string') URL.revokeObjectURL(url)
      reject(new Error('image-decode-failed'))
    }
    img.src = url
  })
}

function canvasToBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('encode-failed'))), type, quality),
  )
}

/** Downscale an uploaded file. Re-encoding drops EXIF metadata (e.g. GPS location). */
export async function prepareOriginal(file: Blob, type: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<Blob> {
  const img = await loadImage(file)
  const { w, h } = scaleToFit(img.naturalWidth, img.naturalHeight, MAX_ORIGINAL)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
  }
  ctx.drawImage(img, 0, 0, w, h)
  return canvasToBlob(c, type, 0.88)
}

/** Render the square face used everywhere in the app. */
export async function renderFace(original: Blob, crop: Crop, type: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<Blob> {
  const img = await loadImage(original)
  const c = document.createElement('canvas')
  c.width = c.height = FACE_SIZE
  const ctx = c.getContext('2d')!
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, FACE_SIZE, FACE_SIZE)
  }
  const r = drawRect(img.naturalWidth, img.naturalHeight, clampCrop(img.naturalWidth, img.naturalHeight, crop), FACE_SIZE)
  ctx.drawImage(img, r.x, r.y, r.w, r.h)
  return canvasToBlob(c, type, 0.9)
}
