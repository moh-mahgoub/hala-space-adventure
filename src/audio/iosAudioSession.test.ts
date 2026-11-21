describe('iPad playback audio session', () => {
  beforeEach(() => vi.resetModules())

  it('uses navigator.audioSession when available (iPadOS 17+)', async () => {
    const session = { type: 'auto' }
    Object.defineProperty(navigator, 'audioSession', { value: session, configurable: true })
    const { enablePlaybackAudio } = await import('./iosAudioSession')
    expect(enablePlaybackAudio()).toBe('audioSession')
    expect(session.type).toBe('playback')
    // @ts-expect-error cleanup
    delete navigator.audioSession
  })

  it('falls back to a silent looping <audio> element on older iPads', async () => {
    const play = vi.fn(() => Promise.resolve())
    vi.stubGlobal('Audio', vi.fn(function (this: Record<string, unknown>) {
      this.play = play
      this.setAttribute = () => {}
    }))
    URL.createObjectURL = () => 'blob:silent'
    const { enablePlaybackAudio } = await import('./iosAudioSession')
    expect(enablePlaybackAudio()).toBe('silent-audio')
    expect(play).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
