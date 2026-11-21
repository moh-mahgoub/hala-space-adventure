/**
 * Crop / zoom / reposition the face. Touch-first:
 *   • one finger drag  → move
 *   • two finger pinch → zoom
 *   • slider and buttons for precise control (and keyboard arrows)
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { clampCrop, drawRect, zoomTo, MAX_ZOOM, MIN_ZOOM, type Crop } from '../../profile/crop'

const FRAME = 300

export function PhotoCropEditor({
  original,
  w,
  h,
  initial,
  onSave,
  onCancel,
  busy,
}: {
  original: Blob
  w: number
  h: number
  initial: Crop
  onSave: (crop: Crop) => void
  onCancel: () => void
  busy?: boolean
}) {
  const [crop, setCrop] = useState<Crop>(() => clampCrop(w, h, initial))
  const url = useMemo(() => URL.createObjectURL(original), [original])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ crop: Crop; dist: number; cx: number; cy: number } | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  const frameSize = () => frameRef.current?.clientWidth || FRAME

  const startGesture = () => {
    const pts = [...pointers.current.values()]
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
    const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0
    gesture.current = { crop, dist, cx, cy }
  }

  const onMove = () => {
    const g = gesture.current
    if (!g) return
    const pts = [...pointers.current.values()]
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
    const f = frameSize()
    let next: Crop = { ...g.crop, x: g.crop.x + (cx - g.cx) / f, y: g.crop.y + (cy - g.cy) / f }
    if (pts.length > 1 && g.dist > 0) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      next = zoomTo(w, h, next, g.crop.zoom * (dist / g.dist))
    }
    setCrop(clampCrop(w, h, next))
  }

  const r = drawRect(w, h, crop, 100) // in % of the frame
  const imgStyle = { left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }
  const nudge = (dx: number, dy: number) => setCrop((c) => clampCrop(w, h, { ...c, x: c.x + dx, y: c.y + dy }))

  return (
    <div className="flex flex-col items-center gap-3" data-testid="crop-editor">
      <p className="text-center text-base text-white/80">
        حرّك الصورة بصباعك وكبّرها بصباعين، لحد ما الوش ييجي جوه الدايرة.
        <br />
        <span dir="ltr" className="text-sm text-white/60">
          Drag to move · pinch or use the slider to zoom · fit the face inside the circle
        </span>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div
          ref={frameRef}
          className="relative aspect-square touch-none overflow-hidden rounded-3xl bg-black select-none"
          style={{ width: `min(${FRAME}px, 72vw)` }}
          data-testid="crop-frame"
          tabIndex={0}
          role="application"
          aria-label="Crop area: drag to move, pinch to zoom, or use arrow keys"
          onKeyDown={(e) => {
            const k: Record<string, [number, number]> = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, -0.02], ArrowDown: [0, 0.02] }
            if (k[e.key]) {
              e.preventDefault()
              nudge(...k[e.key])
            }
            if (e.key === '+' || e.key === '=') setCrop((c) => zoomTo(w, h, c, c.zoom + 0.1))
            if (e.key === '-') setCrop((c) => zoomTo(w, h, c, c.zoom - 0.1))
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
            startGesture()
          }}
          onPointerMove={(e) => {
            if (!pointers.current.has(e.pointerId)) return
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
            onMove()
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId)
            if (pointers.current.size) startGesture()
            else gesture.current = null
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId)
            gesture.current = null
          }}
          onWheel={(e) => setCrop((c) => zoomTo(w, h, c, c.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06)))}
        >
          <img src={url} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={imgStyle} />
          {/* dim everything outside the face circle */}
          <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <mask id="crop-hole">
                <rect width="100" height="100" fill="#fff" />
                <circle cx="50" cy="50" r="46" fill="#000" />
              </mask>
            </defs>
            <rect width="100" height="100" fill="rgba(7,8,33,0.6)" mask="url(#crop-hole)" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="#ffe066" strokeWidth="1" strokeDasharray="3 2" />
          </svg>
        </div>
        {/* live preview inside a helmet */}
        <div className="flex flex-col items-center gap-1" aria-hidden>
          <div className="relative h-28 w-28 rounded-full border-[6px] border-indigo-100 bg-sky-200/30 p-2">
            <div className="relative h-full w-full overflow-hidden rounded-full bg-black">
              <img src={url} alt="" className="absolute max-w-none" style={imgStyle} />
            </div>
          </div>
          <span className="text-sm text-white/70">معاينة · Preview</span>
        </div>
      </div>
      <div className="flex w-full max-w-sm items-center gap-3">
        <button type="button" aria-label="تصغير (Zoom out)" className="h-12 w-12 rounded-full bg-white/10 text-2xl" onClick={() => setCrop((c) => zoomTo(w, h, c, c.zoom - 0.2))}>
          −
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          onChange={(e) => setCrop((c) => zoomTo(w, h, c, Number(e.target.value)))}
          aria-label="Zoom"
          data-testid="crop-zoom"
          className="flex-1 accent-violet-400"
        />
        <button type="button" aria-label="تكبير (Zoom in)" className="h-12 w-12 rounded-full bg-white/10 text-2xl" onClick={() => setCrop((c) => zoomTo(w, h, c, c.zoom + 0.2))}>
          +
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => setCrop(clampCrop(w, h, { x: 0, y: 0, zoom: 1 }))} className="rounded-xl bg-white/10 px-4 py-3 font-bold">
          ↺ توسيط (Reset)
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl bg-white/10 px-4 py-3 font-bold">
          إلغاء (Cancel)
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave(crop)}
          data-testid="crop-save"
          className="rounded-xl bg-emerald-400 px-6 py-3 font-extrabold text-night-900 disabled:opacity-50"
        >
          {busy ? '…' : '✓ حفظ (Save)'}
        </button>
      </div>
    </div>
  )
}
