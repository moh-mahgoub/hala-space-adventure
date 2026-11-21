import { clampCrop, drawRect, scaleToFit, zoomTo, MAX_ZOOM } from './crop'

describe('crop maths', () => {
  it('zoom 1 covers the frame exactly on the short side', () => {
    const r = drawRect(800, 600, { x: 0, y: 0, zoom: 1 }, 300)
    expect(r.h).toBeCloseTo(300)
    expect(r.w).toBeCloseTo(400)
    expect(r.x).toBeCloseTo(-50)
    expect(r.y).toBeCloseTo(0)
  })

  it('never leaves empty corners (clamps the offset)', () => {
    const c = clampCrop(800, 600, { x: 5, y: -5, zoom: 1 })
    const r = drawRect(800, 600, c, 100)
    expect(r.x).toBeLessThanOrEqual(1e-9)
    expect(r.y).toBeLessThanOrEqual(1e-9)
    expect(r.x + r.w).toBeGreaterThanOrEqual(100 - 1e-9)
    expect(r.y + r.h).toBeGreaterThanOrEqual(100 - 1e-9)
  })

  it('limits zoom and repairs bad numbers', () => {
    expect(clampCrop(100, 100, { x: 0, y: 0, zoom: 99 }).zoom).toBe(MAX_ZOOM)
    expect(clampCrop(100, 100, { x: NaN, y: Infinity, zoom: NaN })).toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it('zooming keeps the same point centred', () => {
    const c = zoomTo(1000, 1000, { x: 0.1, y: 0, zoom: 2 }, 4)
    expect(c.zoom).toBe(4)
    expect(c.x).toBeCloseTo(0.2)
  })

  it('downscales large uploads', () => {
    expect(scaleToFit(4000, 3000, 1280)).toEqual({ w: 1280, h: 960 })
    expect(scaleToFit(300, 200, 1280)).toEqual({ w: 300, h: 200 })
  })
})
