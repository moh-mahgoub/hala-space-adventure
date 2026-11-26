import { useEffect, useRef, useState } from 'react'
import { isReducedMotion, settingsStore, useSettings } from './state/settings'

/** Reduced-motion flag (system preference or parent override). */
export function useReducedMotion(): boolean {
  const s = useSettings()
  const [sys, setSys] = useState(() => isReducedMotion(s))
  useEffect(() => {
    const mq = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
    const update = () => setSys(isReducedMotion(settingsStore.get()))
    update()
    mq?.addEventListener?.('change', update)
    return () => mq?.removeEventListener?.('change', update)
  }, [s.motion])
  return sys
}

/** Run once after mount (StrictMode-safe-ish: guarded by ref). */
export function useOnce(fn: () => void | (() => void)) {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    return fn() ?? undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/** Element size via ResizeObserver */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

/** setTimeout that is cleared on unmount */
export function useTimeouts() {
  const ids = useRef<number[]>([])
  useEffect(() => () => ids.current.forEach((i) => clearTimeout(i)), [])
  return (fn: () => void, ms: number) => {
    ids.current.push(window.setTimeout(fn, ms))
  }
}

/** A ref that is true while the component is mounted (to skip work after leaving a screen). */
export function useAlive() {
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => void (alive.current = false)
  }, [])
  return alive
}
