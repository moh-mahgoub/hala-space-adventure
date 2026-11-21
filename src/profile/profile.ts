/**
 * The child's personalised look — ONE central place for style, crop data and
 * image references. Metadata lives in localStorage; the pictures themselves in
 * IndexedDB (see imageStore.ts). Nothing is ever sent over the network.
 */
import { useSyncExternalStore } from 'react'
import { createPersistedStore } from '../state/store'
import { DEFAULT_CROP, clampCrop, prepareOriginal, renderFace, type Crop } from './crop'
import { deleteImage, getImage, putImage, type ImageKey } from './imageStore'

/** default = illustrated astronaut; photo = real face in helmet; sticker = funny sticker look; cartoon = imported cartoon portrait */
export type LookStyle = 'default' | 'photo' | 'sticker' | 'cartoon'
export type ImageKind = 'photo' | 'cartoon'

export interface ProfileMeta {
  style: LookStyle
  photo: { crop: Crop; w: number; h: number; updated: number } | null
  cartoon: { crop: Crop; w: number; h: number; updated: number } | null
}

const EMPTY: ProfileMeta = { style: 'default', photo: null, cartoon: null }

function sanitizeImg(v: unknown): ProfileMeta['photo'] {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const w = Number(o.w)
  const h = Number(o.h)
  if (!(w > 0 && h > 0)) return null
  const c = (o.crop ?? {}) as Partial<Crop>
  return { w, h, crop: clampCrop(w, h, { x: Number(c.x) || 0, y: Number(c.y) || 0, zoom: Number(c.zoom) || 1 }), updated: Number(o.updated) || 0 }
}

export function sanitizeProfile(raw: Partial<ProfileMeta>): ProfileMeta {
  const style: LookStyle = (['default', 'photo', 'sticker', 'cartoon'] as const).includes(raw.style as LookStyle)
    ? (raw.style as LookStyle)
    : 'default'
  return { style, photo: sanitizeImg(raw.photo), cartoon: sanitizeImg(raw.cartoon) }
}

export const profileStore = createPersistedStore<ProfileMeta>('profile', EMPTY, sanitizeProfile)

// ── runtime image URLs (object URLs from IndexedDB blobs) ────────────────

interface Urls {
  photoFace: string | null
  cartoonFace: string | null
  loaded: boolean
}
let urls: Urls = { photoFace: null, cartoonFace: null, loaded: false }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribeUrls = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const createUrl = (b: Blob | null) => (b && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(b) : null)
function setUrl(key: 'photoFace' | 'cartoonFace', blob: Blob | null) {
  const old = urls[key]
  if (old && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(old)
  urls = { ...urls, [key]: createUrl(blob) }
}

/** Load stored faces once at startup. Safe to call repeatedly. */
let loading: Promise<void> | null = null
export function loadProfileImages(): Promise<void> {
  if (loading) return loading
  loading = (async () => {
    const meta = profileStore.get()
    const [p, c] = await Promise.all([
      meta.photo ? getImage('photo-face') : Promise.resolve(null),
      meta.cartoon ? getImage('cartoon-face') : Promise.resolve(null),
    ])
    setUrl('photoFace', p)
    setUrl('cartoonFace', c)
    // metadata says there's a picture but the browser lost it (storage cleared)
    if (meta.photo && !p) profileStore.set({ photo: null })
    if (meta.cartoon && !c) profileStore.set({ cartoon: null })
    urls = { ...urls, loaded: true }
    emit()
  })()
  return loading
}

const keys = (kind: ImageKind): [ImageKey, ImageKey] =>
  kind === 'photo' ? ['photo-original', 'photo-face'] : ['cartoon-original', 'cartoon-face']

/** Store a new upload (downscaled, metadata stripped). Returns its size for the crop editor. */
export async function importImage(kind: ImageKind, file: Blob): Promise<{ w: number; h: number; original: Blob }> {
  // cartoons may have transparency → keep PNG; photos → JPEG
  const original = await prepareOriginal(file, kind === 'cartoon' ? 'image/png' : 'image/jpeg')
  const { loadImage } = await import('./crop')
  const img = await loadImage(original)
  return { w: img.naturalWidth, h: img.naturalHeight, original }
}

/** Save original + crop and render the face used across the app. */
export async function saveImage(kind: ImageKind, original: Blob, w: number, h: number, crop: Crop): Promise<void> {
  const c = clampCrop(w, h, crop)
  const face = await renderFace(original, c, kind === 'cartoon' ? 'image/png' : 'image/jpeg')
  const [kOrig, kFace] = keys(kind)
  await putImage(kOrig, original)
  await putImage(kFace, face)
  setUrl(kind === 'photo' ? 'photoFace' : 'cartoonFace', face)
  const meta = profileStore.get()
  // first picture: switch the look on automatically; afterwards the parent's choice wins
  const nextStyle: LookStyle = meta.style === 'default' ? (kind === 'photo' ? 'photo' : 'cartoon') : meta.style
  profileStore.set({ [kind]: { crop: c, w, h, updated: Date.now() }, style: nextStyle } as Partial<ProfileMeta>)
  emit()
}

/** Load the stored original again (for re-cropping). */
export async function getOriginal(kind: ImageKind): Promise<Blob | null> {
  return getImage(keys(kind)[0])
}

export async function removeImage(kind: ImageKind): Promise<void> {
  const [kOrig, kFace] = keys(kind)
  await deleteImage(kOrig)
  await deleteImage(kFace)
  setUrl(kind === 'photo' ? 'photoFace' : 'cartoonFace', null)
  profileStore.set({ [kind]: null } as Partial<ProfileMeta>)
  emit()
}

export function setLookStyle(style: LookStyle) {
  profileStore.set({ style })
}

// ── what the app should actually show ───────────────────────────────────

export interface ChildLook {
  /** style after fallbacks (e.g. "photo" chosen but no photo → default) */
  style: LookStyle
  /** face image to draw, or null → illustrated default face */
  faceUrl: string | null
}

export function resolveLook(meta: ProfileMeta, u: Pick<Urls, 'photoFace' | 'cartoonFace'>): ChildLook {
  switch (meta.style) {
    case 'photo':
      return u.photoFace ? { style: 'photo', faceUrl: u.photoFace } : { style: 'default', faceUrl: null }
    case 'sticker': {
      const f = u.photoFace ?? u.cartoonFace
      return f ? { style: 'sticker', faceUrl: f } : { style: 'default', faceUrl: null }
    }
    case 'cartoon':
      return u.cartoonFace ? { style: 'cartoon', faceUrl: u.cartoonFace } : u.photoFace ? { style: 'photo', faceUrl: u.photoFace } : { style: 'default', faceUrl: null }
    default:
      return { style: 'default', faceUrl: null }
  }
}

let lastMeta: ProfileMeta | null = null
let lastUrls: Urls | null = null
let lastLook: ChildLook = { style: 'default', faceUrl: null }
function getLook(): ChildLook {
  const meta = profileStore.get()
  if (meta !== lastMeta || urls !== lastUrls) {
    lastMeta = meta
    lastUrls = urls
    const next = resolveLook(meta, urls)
    if (next.style !== lastLook.style || next.faceUrl !== lastLook.faceUrl) lastLook = next
  }
  return lastLook
}
const subscribeLook = (fn: () => void) => {
  const a = profileStore.subscribe(fn)
  const b = subscribeUrls(fn)
  return () => {
    a()
    b()
  }
}

/** The resolved look, for any component that draws the child. */
export function useChildLook(): ChildLook {
  return useSyncExternalStore(subscribeLook, getLook, getLook)
}

/** Raw state for the parent panel. */
export function useProfileState() {
  const meta = useSyncExternalStore(profileStore.subscribe, profileStore.get, profileStore.get)
  const u = useSyncExternalStore(subscribeUrls, () => urls, () => urls)
  return { meta, urls: u }
}

export { DEFAULT_CROP }

/** test helper */
export function _resetProfileForTests() {
  urls = { photoFace: null, cartoonFace: null, loaded: false }
  loading = null
  profileStore.replace(EMPTY)
  emit()
}
