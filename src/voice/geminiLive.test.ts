import type { LiveServerMessage } from '@google/genai/web'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GeminiPlaybackMicGuard, parseGeminiServerMessage } from './geminiLive'

describe('Gemini Live event parser', () => {
  it('processes every audio part in a single model turn', () => {
    const parsed = parseGeminiServerMessage({
      serverContent: {
        modelTurn: {
          role: 'model',
          parts: [
            { inlineData: { data: 'YQ==', mimeType: 'audio/pcm' } },
            { text: 'ignored text part' },
            { inlineData: { data: 'Yg==', mimeType: 'audio/pcm' } },
          ],
        },
        outputTranscription: { text: 'Hello' },
        inputTranscription: { text: 'Hi' },
        turnComplete: true,
      },
    } as LiveServerMessage)
    expect(parsed.audioChunks).toEqual(['YQ==', 'Yg=='])
    expect(parsed.interviewerTranscript).toBe('Hello')
    expect(parsed.candidateTranscript).toBe('Hi')
    expect(parsed.turnComplete).toBe(true)
  })

  it('surfaces GoAway and resumable handles', () => {
    const parsed = parseGeminiServerMessage({
      goAway: { timeLeft: '10s' },
      sessionResumptionUpdate: { resumable: true, newHandle: 'resume-handle' },
    } as LiveServerMessage)
    expect(parsed.goAway).toBe(true)
    expect(parsed.goAwayTimeLeft).toBe('10s')
    expect(parsed.resumeHandle).toBe('resume-handle')
  })
})

describe('Gemini playback microphone guard', () => {
  afterEach(() => vi.useRealTimers())

  it('keeps microphone input blocked until the queued model audio finishes', () => {
    vi.useFakeTimers()
    let muted = false
    let remaining = 2
    const guard = new GeminiPlaybackMicGuard(
      (nextMuted) => { muted = nextMuted },
      () => remaining,
    )

    guard.blockBeforeQueueing()
    guard.releaseAfterQueueDrains()

    expect(muted).toBe(true)
    vi.advanceTimersByTime(2149)
    expect(muted).toBe(true)
    vi.advanceTimersByTime(1)
    expect(muted).toBe(false)

    remaining = 1
    guard.blockBeforeQueueing()
    guard.releaseAfterQueueDrains()
    expect(muted).toBe(true)
    guard.releaseAfterInterruption()
    expect(muted).toBe(false)
  })

  it('preserves explicit mute and pause state across playback', () => {
    vi.useFakeTimers()
    let muted = false
    let remaining = 1
    const guard = new GeminiPlaybackMicGuard(
      (nextMuted) => { muted = nextMuted },
      () => remaining,
    )

    guard.setUserMuted(true)
    guard.blockBeforeQueueing()
    guard.releaseAfterQueueDrains()
    vi.advanceTimersByTime(1150)
    expect(muted).toBe(true)

    guard.setUserMuted(false)
    expect(muted).toBe(false)

    guard.setPaused(true)
    expect(muted).toBe(true)
    remaining = 0
    guard.setPaused(false)
    expect(muted).toBe(false)
  })
})
