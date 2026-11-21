import 'fake-indexeddb/auto'
import { _resetForTests, deleteImage, getImage, putImage } from './imageStore'

// jsdom has no canvas: replace the canvas helpers with simple fakes
vi.mock('./crop', async (orig) => {
  const real = await orig<typeof import('./crop')>()
  return {
    ...real,
    prepareOriginal: async (b: Blob) => b,
    renderFace: async () => new Blob(['face'], { type: 'image/jpeg' }),
    loadImage: async () => ({ naturalWidth: 640, naturalHeight: 800 }),
  }
})

import {
  _resetProfileForTests,
  importImage,
  loadProfileImages,
  profileStore,
  removeImage,
  resolveLook,
  sanitizeProfile,
  saveImage,
  setLookStyle,
} from './profile'

let n = 0
beforeAll(() => {
  globalThis.URL.createObjectURL = () => `blob:test/${++n}`
  globalThis.URL.revokeObjectURL = () => {}
})
beforeEach(() => {
  localStorage.clear()
  _resetProfileForTests()
})

describe('local image store (IndexedDB)', () => {
  it('stores, reloads and deletes images', async () => {
    await putImage('photo-face', new Blob(['abc']))
    _resetForTests() // simulate a page reload: memory cache gone, DB remains
    // read back from IndexedDB (not from the in-memory cache)
    expect(await getImage('photo-face')).not.toBeNull()
    await deleteImage('photo-face')
    _resetForTests()
    expect(await getImage('photo-face')).toBeNull()
  })
})

describe('child profile', () => {
  it('falls back to the illustrated astronaut when no picture exists', () => {
    const none = { photoFace: null, cartoonFace: null }
    for (const style of ['default', 'photo', 'sticker', 'cartoon'] as const) {
      expect(resolveLook({ style, photo: null, cartoon: null }, none)).toEqual({ style: 'default', faceUrl: null })
    }
  })

  it('resolves each look to the right picture', () => {
    const u = { photoFace: 'blob:p', cartoonFace: 'blob:c' }
    const m = { photo: null, cartoon: null }
    expect(resolveLook({ ...m, style: 'photo' }, u)).toEqual({ style: 'photo', faceUrl: 'blob:p' })
    expect(resolveLook({ ...m, style: 'sticker' }, u)).toEqual({ style: 'sticker', faceUrl: 'blob:p' })
    expect(resolveLook({ ...m, style: 'cartoon' }, u)).toEqual({ style: 'cartoon', faceUrl: 'blob:c' })
    expect(resolveLook({ ...m, style: 'cartoon' }, { photoFace: 'blob:p', cartoonFace: null }).style).toBe('photo')
  })

  it('sanitizes stored metadata', () => {
    expect(sanitizeProfile({ style: 'evil' as never, photo: { w: -1 } as never })).toEqual({ style: 'default', photo: null, cartoon: null })
  })

  it('upload → save switches to the photo look and survives a reload; delete removes it', async () => {
    const file = new Blob(['img'], { type: 'image/png' })
    const { w, h, original } = await importImage('photo', file)
    await saveImage('photo', original, w, h, { x: 0, y: 0.1, zoom: 1.5 })
    expect(profileStore.get().style).toBe('photo')
    expect(profileStore.get().photo).toMatchObject({ w: 640, h: 800, crop: { zoom: 1.5 } })

    // reload: metadata from localStorage + images from IndexedDB
    _resetForTests()
    const meta = profileStore.get()
    _resetProfileForTests()
    profileStore.replace(meta)
    await loadProfileImages()
    expect(resolveLook(profileStore.get(), { photoFace: 'x', cartoonFace: null }).style).toBe('photo')
    expect(await getImage('photo-face')).not.toBeNull()
    expect(await getImage('photo-original')).not.toBeNull()

    await removeImage('photo')
    expect(profileStore.get().photo).toBeNull()
    expect(await getImage('photo-face')).toBeNull()
    expect(await getImage('photo-original')).toBeNull()
  })

  it('forgets metadata if the browser lost the stored picture', async () => {
    profileStore.set({ style: 'photo', photo: { w: 10, h: 10, crop: { x: 0, y: 0, zoom: 1 }, updated: 1 } })
    await loadProfileImages()
    expect(profileStore.get().photo).toBeNull()
  })

  it('keeps the parent’s chosen look on later uploads', async () => {
    const { w, h, original } = await importImage('photo', new Blob(['a']))
    await saveImage('photo', original, w, h, { x: 0, y: 0, zoom: 1 })
    setLookStyle('sticker')
    await saveImage('photo', original, w, h, { x: 0, y: 0, zoom: 2 })
    expect(profileStore.get().style).toBe('sticker')
  })
})
