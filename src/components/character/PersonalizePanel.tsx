/**
 * Parent-only: upload / crop / replace / delete the child's photo and an
 * optional imported cartoon portrait, and choose the look.
 * Pictures stay in this browser (IndexedDB). Nothing is uploaded anywhere.
 */
import { useEffect, useRef, useState } from 'react'
import { DEFAULT_CROP, type Crop } from '../../profile/crop'
import { isPersistent } from '../../profile/imageStore'
import {
  getOriginal,
  importImage,
  removeImage,
  saveImage,
  setLookStyle,
  useProfileState,
  type ImageKind,
  type LookStyle,
} from '../../profile/profile'
import { useSettings } from '../../state/settings'
import { AstronautCharacter } from './AstronautCharacter'
import { ChildAvatar } from './ChildAvatar'
import { PhotoCropEditor } from './PhotoCropEditor'

interface Editing {
  kind: ImageKind
  original: Blob
  w: number
  h: number
  crop: Crop
}

const STYLE_INFO: Record<LookStyle, { ar: string; en: string }> = {
  default: { ar: 'رائدة الفضاء الكرتون', en: 'Illustrated astronaut (no photo)' },
  photo: { ar: 'صورة حقيقية', en: 'Real photo in the helmet' },
  sticker: { ar: 'استيكر مضحك', en: 'Funny cartoon sticker' },
  cartoon: { ar: 'كرتون مستورد', en: 'Imported cartoon portrait' },
}

export function PersonalizePanel() {
  const { meta, urls } = useProfileState()
  const { childName } = useSettings()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ImageKind | null>(null)
  const [persistent, setPersistent] = useState(true)
  const photoInput = useRef<HTMLInputElement>(null)
  const cartoonInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void isPersistent().then(setPersistent)
  }, [])

  const onFile = async (kind: ImageKind, file: File | undefined) => {
    setError(null)
    if (!file) return
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif|gif)$/i.test(file.name)) {
      setError('الملف ده مش صورة. Please choose an image file.')
      return
    }
    setBusy(true)
    try {
      const { w, h, original } = await importImage(kind, file)
      setEditing({ kind, original, w, h, crop: DEFAULT_CROP })
    } catch {
      setError('مقدرناش نفتح الصورة دي. جرّب JPG أو PNG. (This image format could not be opened — try JPG or PNG.)')
    } finally {
      setBusy(false)
    }
  }

  const recrop = async (kind: ImageKind) => {
    const m = meta[kind]
    const original = await getOriginal(kind)
    if (m && original) setEditing({ kind, original, w: m.w, h: m.h, crop: m.crop })
  }

  if (editing) {
    return (
      <section className="py-3" aria-label="قص الصورة">
        <h3 className="mb-2 text-xl font-bold">{editing.kind === 'photo' ? 'قص صورة الوش' : 'قص صورة الكرتون'}</h3>
        <PhotoCropEditor
          original={editing.original}
          w={editing.w}
          h={editing.h}
          initial={editing.crop}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={async (crop) => {
            setBusy(true)
            try {
              await saveImage(editing.kind, editing.original, editing.w, editing.h, crop)
              setEditing(null)
            } catch {
              setError('حصلت مشكلة في الحفظ. (Saving failed.)')
            } finally {
              setBusy(false)
            }
          }}
        />
      </section>
    )
  }

  const looks: { style: LookStyle; faceUrl: string | null; available: boolean }[] = [
    { style: 'default', faceUrl: null, available: true },
    { style: 'photo', faceUrl: urls.photoFace, available: !!urls.photoFace },
    { style: 'sticker', faceUrl: urls.photoFace ?? urls.cartoonFace, available: !!(urls.photoFace ?? urls.cartoonFace) },
    { style: 'cartoon', faceUrl: urls.cartoonFace, available: !!urls.cartoonFace },
  ]

  const imageRow = (kind: ImageKind) => {
    const has = kind === 'photo' ? !!urls.photoFace : !!urls.cartoonFace
    const input = kind === 'photo' ? photoInput : cartoonInput
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/5 p-3" data-testid={`image-row-${kind}`}>
        <ChildAvatar
          size={64}
          look={{ style: kind === 'photo' ? 'photo' : 'cartoon', faceUrl: kind === 'photo' ? urls.photoFace : urls.cartoonFace }}
        />
        <div className="min-w-40 flex-1">
          <div className="text-lg font-bold">{kind === 'photo' ? `صورة ${childName}` : 'صورة كرتون (اختياري)'}</div>
          <div className="text-sm text-white/60" dir="ltr">
            {kind === 'photo'
              ? 'A photo of the child’s face.'
              : 'A cartoon portrait made elsewhere (e.g. drawn by you or an app you trust). This app does not turn photos into cartoons.'}
          </div>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          data-testid={`file-${kind}`}
          onChange={(e) => {
            void onFile(kind, e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-xl bg-violet-500 px-4 py-2 font-bold" data-testid={`upload-${kind}`}>
          {has ? '🔁 تغيير (Replace)' : '📷 رفع صورة (Upload)'}
        </button>
        {has && (
          <>
            <button type="button" onClick={() => void recrop(kind)} className="rounded-xl bg-white/10 px-4 py-2 font-bold" data-testid={`recrop-${kind}`}>
              ✂️ قص (Crop)
            </button>
            <button
              type="button"
              data-testid={`delete-${kind}`}
              onClick={async () => {
                if (confirmDelete === kind) {
                  await removeImage(kind)
                  setConfirmDelete(null)
                } else setConfirmDelete(kind)
              }}
              className={`rounded-xl px-4 py-2 font-bold ${confirmDelete === kind ? 'bg-red-500' : 'bg-white/10'}`}
            >
              {confirmDelete === kind ? 'متأكد؟ امسح (Confirm delete)' : '🗑️ مسح (Delete)'}
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-3 py-3" aria-label="شخصية رائدة الفضاء" data-testid="personalize-panel">
      <h3 className="text-2xl font-extrabold">
        👩‍🚀 {childName} رائدة الفضاء <span className="text-base font-medium text-white/60">Astronaut character</span>
      </h3>

      <div className="rounded-2xl border border-emerald-300/40 bg-emerald-400/10 p-3 text-sm leading-relaxed" data-testid="privacy-note">
        <p>
          🔒 الصورة بتتحفظ على الجهاز ده وفي المتصفح ده بس. مش بتترفع على أي سيرفر، ومش بتروح GitHub، ومفيش ذكاء اصطناعي
          ولا تعرّف على الوجوه. لو فتحت التطبيق من جهاز أو متصفح تاني، الصورة مش هتكون موجودة هناك.
        </p>
        <p dir="ltr" className="mt-1 text-white/75">
          Photos are stored only in this browser on this device (IndexedDB). They are never uploaded, never sent to any
          AI or face-recognition service, and never part of the website’s code. Another browser or device won’t have
          them. Clearing this site’s data (or using “Delete” below) removes them. Re-encoding also strips photo
          metadata such as location.
        </p>
        {!persistent && (
          <p className="mt-2 font-bold text-amber-200" dir="ltr">
            ⚠️ This browser is blocking local storage (private mode?). The picture will work until the page is closed,
            but won’t be remembered.
          </p>
        )}
      </div>

      {imageRow('photo')}
      {imageRow('cartoon')}
      {error && (
        <p role="alert" className="rounded-xl bg-red-500/20 p-3 font-bold">
          {error}
        </p>
      )}

      <div>
        <div className="mb-2 text-lg font-bold">
          الشكل <span className="text-sm font-medium text-white/60">Look</span>
        </div>
        <div role="radiogroup" aria-label="Character look" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {looks.map((l) => (
            <button
              key={l.style}
              type="button"
              role="radio"
              aria-checked={meta.style === l.style}
              disabled={!l.available}
              data-testid={`look-${l.style}`}
              onClick={() => setLookStyle(l.style)}
              className={`flex flex-col items-center gap-1 rounded-2xl border-4 p-2 transition-colors disabled:opacity-35 ${
                meta.style === l.style ? 'border-yellow-300 bg-yellow-300/10' : 'border-white/10 bg-white/5'
              }`}
            >
              <AstronautCharacter size={70} look={{ style: l.style, faceUrl: l.faceUrl }} />
              <span className="text-base font-bold">{STYLE_INFO[l.style].ar}</span>
              <span className="text-xs text-white/60" dir="ltr">
                {l.available ? STYLE_INFO[l.style].en : l.style === 'cartoon' ? 'Upload a cartoon first' : 'Upload a photo first'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
