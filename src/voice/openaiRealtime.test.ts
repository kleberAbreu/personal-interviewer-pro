import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseOpenAiUsage, startOpenAiRealtime } from './openaiRealtime'

describe('OpenAI Realtime usage parser', () => {
  it('extracts GA audio, text, and cached usage', () => {
    expect(parseOpenAiUsage({
      response: {
        usage: {
          input_tokens: 140,
          output_tokens: 90,
          input_token_details: { audio_tokens: 100, text_tokens: 40, cached_tokens: 20 },
          output_token_details: { audio_tokens: 80, text_tokens: 10 },
        },
      },
    })).toEqual({
      inputAudioTokens: 100,
      outputAudioTokens: 80,
      inputTextTokens: 40,
      outputTextTokens: 10,
      cachedInputTokens: 20,
      estimated: false,
    })
  })

  it('returns null when response.done has no usage', () => {
    expect(parseOpenAiUsage({ response: {} })).toBeNull()
  })
})

describe('OpenAI WebRTC adapter', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('connects, configures GA events, handles controls, usage, barge-in, and end_interview', async () => {
    const track = { enabled: true, stop: vi.fn() }
    const stream = { getAudioTracks: () => [track], getTracks: () => [track] }
    class MockDataChannel {
      readyState = 'open'
      sent: string[] = []
      onopen: (() => void) | null = null
      onmessage: ((event: { data: string }) => void) | null = null
      onerror: (() => void) | null = null
      send(value: string) { this.sent.push(value) }
      close() {}
      emit(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }) }
    }
    const channel = new MockDataChannel()
    class MockPeerConnection {
      connectionState = 'connected'
      ontrack: ((event: { streams: unknown[] }) => void) | null = null
      onconnectionstatechange: (() => void) | null = null
      createDataChannel() { return channel }
      addTrack() {}
      async createOffer() { return { type: 'offer', sdp: 'offer-sdp' } }
      async setLocalDescription() {}
      async setRemoteDescription() { channel.onopen?.() }
      close() { this.connectionState = 'closed' }
    }
    const audioInstances: MockAudio[] = []
    class MockAudio {
      autoplay = false
      muted = false
      srcObject: unknown = null
      play = vi.fn(async () => {})
      pause = vi.fn()
      setAttribute() {}
      constructor() { audioInstances.push(this) }
    }
    class MockAudioContext {
      createAnalyser() {
        return { fftSize: 256, getByteTimeDomainData: (samples: Uint8Array) => samples.fill(128) }
      }
      createMediaStreamSource() { return { connect() {}, disconnect() {} } }
      async close() {}
    }
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => stream) } })
    vi.stubGlobal('RTCPeerConnection', MockPeerConnection)
    vi.stubGlobal('Audio', MockAudio)
    vi.stubGlobal('AudioContext', MockAudioContext)
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      if (input === '/api/voice/openai/client-secret') {
        return { ok: true, json: async () => ({ value: 'ephemeral', expiresAt: Math.floor(Date.now() / 1000) + 60 }) }
      }
      return { ok: true, text: async () => 'answer-sdp' }
    }))

    const onOpen = vi.fn()
    const onUsage = vi.fn()
    const onEndRequested = vi.fn()
    const session = await startOpenAiRealtime({
      model: 'gpt-realtime-2.1',
      voiceName: 'marin',
      systemInstruction: 'Interview the candidate.',
      language: 'en-US',
      durationMinutes: 15,
      reasoningMode: 'balanced',
      expressiveness: 'standard',
    }, {
      onOpen,
      onAudioLevel: vi.fn(),
      onTranscript: vi.fn(),
      onEndRequested,
      onError: vi.fn(),
      onClose: vi.fn(),
      onUsage,
    })
    const audio = audioInstances[0]

    expect(onOpen).toHaveBeenCalledOnce()
    const update = channel.sent.map((value) => JSON.parse(value)).find((event) => event.type === 'session.update')
    expect(update.session.reasoning.effort).toBe('low')
    expect(update.session.audio.input.transcription.model).toBe('gpt-4o-transcribe')
    expect(update.session.audio.input.turn_detection).toEqual({
      type: 'semantic_vad',
      create_response: true,
      interrupt_response: true,
    })

    session.setMuted(true)
    expect(track.enabled).toBe(false)
    session.setMuted(false)
    session.setPaused(true)
    expect(audio.pause).toHaveBeenCalled()
    session.setPaused(false)
    expect(track.enabled).toBe(true)

    channel.emit({ type: 'input_audio_buffer.speech_started' })
    expect(audio.muted).toBe(false)
    channel.emit({ type: 'response.created' })
    expect(audio.muted).toBe(false)
    channel.emit({ type: 'output_audio_buffer.started' })
    expect(audio.muted).toBe(false)
    channel.emit({ type: 'input_audio_buffer.speech_started' })
    expect(audio.muted).toBe(false)
    channel.emit({ type: 'response.output_audio.delta', delta: 'audio' })
    expect(audio.muted).toBe(false)
    channel.emit({
      type: 'response.done',
      response: { usage: { input_tokens: 10, output_tokens: 20, input_token_details: { audio_tokens: 10 }, output_token_details: { audio_tokens: 20 } } },
    })
    expect(onUsage).toHaveBeenCalled()
    channel.emit({ type: 'response.function_call_arguments.done', name: 'end_interview' })
    expect(onEndRequested).toHaveBeenCalledWith(1.5)
    session.stop()
  })
})
