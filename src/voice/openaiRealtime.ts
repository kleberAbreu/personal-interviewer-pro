import { supportsVoiceReasoning, VOICE_REASONING_EFFORT } from '../config/models'
import type { VoiceUsage } from '../types'
import { requestOpenAiClientSecret } from './broker'
import type { VoiceCallbacks, VoiceSession, VoiceSessionOptions } from './types'

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' ? value as JsonObject : {}
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function parseOpenAiUsage(event: unknown): VoiceUsage | null {
  const response = asObject(asObject(event).response)
  const usage = asObject(response.usage)
  if (!Object.keys(usage).length) return null

  const inputDetails = asObject(usage.input_token_details ?? usage.input_tokens_details)
  const outputDetails = asObject(usage.output_token_details ?? usage.output_tokens_details)
  const inputTotal = number(usage.input_tokens)
  const outputTotal = number(usage.output_tokens)
  const inputAudio = number(inputDetails.audio_tokens)
  const outputAudio = number(outputDetails.audio_tokens)

  return {
    inputAudioTokens: inputAudio,
    outputAudioTokens: outputAudio,
    inputTextTokens: number(inputDetails.text_tokens) || Math.max(0, inputTotal - inputAudio),
    outputTextTokens: number(outputDetails.text_tokens) || Math.max(0, outputTotal - outputAudio),
    cachedInputTokens: number(inputDetails.cached_tokens),
    estimated: false,
  }
}

function createAudioMeter(stream: MediaStream, onLevel: (level: number) => void): () => void {
  const context = new AudioContext()
  const analyser = context.createAnalyser()
  analyser.fftSize = 256
  const source = context.createMediaStreamSource(stream)
  source.connect(analyser)
  const samples = new Uint8Array(analyser.fftSize)
  let frame = 0

  const measure = () => {
    analyser.getByteTimeDomainData(samples)
    let sum = 0
    for (const sample of samples) {
      const centered = (sample - 128) / 128
      sum += centered * centered
    }
    onLevel(Math.sqrt(sum / samples.length))
    frame = requestAnimationFrame(measure)
  }
  measure()

  return () => {
    cancelAnimationFrame(frame)
    source.disconnect()
    void context.close()
  }
}

export async function startOpenAiRealtime(
  opts: VoiceSessionOptions,
  cb: VoiceCallbacks,
): Promise<VoiceSession> {
  const secret = await requestOpenAiClientSecret(opts.model, opts.voiceName)
  if (secret.expiresAt <= Math.floor(Date.now() / 1000)) throw new Error('VOICE_CREDENTIAL_EXPIRED')

  const captureMic = opts.captureMic !== false
  const stream = captureMic
    ? await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
    : null
  const track = stream?.getAudioTracks()[0]
  const peer = new RTCPeerConnection()
  const events = peer.createDataChannel('oai-events')
  const remoteAudio = new Audio()
  remoteAudio.autoplay = true
  let closed = false
  let opened = false
  let endRequested = false
  let paused = false
  let muted = false
  let lastResponseAt = performance.now()
  let responseStartedAt = lastResponseAt
  const stopMeter = stream ? createAudioMeter(stream, cb.onAudioLevel) : () => {}

  if (track && stream) peer.addTrack(track, stream)
  else peer.addTransceiver('audio', { direction: 'recvonly' })
  peer.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0]
    void remoteAudio.play().catch(() => {})
  }

  const send = (value: unknown) => {
    if (events.readyState === 'open') events.send(JSON.stringify(value))
  }

  events.onopen = () => {
    if (closed) return
    const modelRef = { provider: 'openai' as const, model: opts.model }
    send({
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: opts.systemInstruction,
        output_modalities: ['audio'],
        ...(supportsVoiceReasoning(modelRef)
          ? { reasoning: { effort: VOICE_REASONING_EFFORT[opts.reasoningMode] } }
          : {}),
        audio: {
          input: {
            turn_detection: { type: 'semantic_vad' },
            transcription: { model: 'gpt-4o-transcribe' },
          },
          output: { voice: opts.voiceName },
        },
        ...(opts.enableEndTool === false ? {} : {
          tools: [{
            type: 'function',
            name: 'end_interview',
            description: 'Call immediately after the final goodbye when the interview is complete.',
            parameters: { type: 'object', properties: {}, additionalProperties: false },
          }],
        }),
      },
    })
    if (opts.kickoff !== false) send({ type: 'response.create' })
    opened = true
    cb.onOpen()
  }

  events.onmessage = (rawEvent) => {
    if (closed) return
    let event: JsonObject
    try {
      event = JSON.parse(String(rawEvent.data)) as JsonObject
    } catch {
      return
    }
    const type = String(event.type ?? '')

    if (type === 'response.created') responseStartedAt = performance.now()

    if (type === 'response.output_audio_transcript.done' || type === 'response.audio_transcript.done') {
      const text = String(event.transcript ?? '').trim()
      if (text) cb.onTranscript('interviewer', text)
    }

    if (type === 'conversation.item.input_audio_transcription.completed') {
      const text = String(event.transcript ?? '').trim()
      if (text) cb.onTranscript('candidate', text)
    }

    if (type === 'input_audio_buffer.speech_started') {
      remoteAudio.muted = true
    }
    if (
      type === 'response.output_audio.started' ||
      type === 'response.output_audio.delta' ||
      type === 'response.audio.started' ||
      type === 'response.audio.delta'
    ) {
      remoteAudio.muted = paused
    }

    if (type === 'response.function_call_arguments.done' && event.name === 'end_interview' && !endRequested) {
      endRequested = true
      cb.onEndRequested(1.5)
    }

    if (type === 'response.done') {
      const usage = parseOpenAiUsage(event)
      if (usage) {
        cb.onUsage(usage)
      } else {
        const now = performance.now()
        cb.onUsage({
          inputAudioTokens: Math.round(Math.max(0, now - lastResponseAt) / 100),
          outputAudioTokens: Math.round(Math.max(0, now - responseStartedAt) / 50),
          inputTextTokens: 0,
          outputTextTokens: 0,
          cachedInputTokens: 0,
          estimated: true,
        })
      }
      lastResponseAt = performance.now()
      cb.onTurnComplete?.()

      const output = asObject(event.response).output
      if (Array.isArray(output) && output.some((item) => {
        const candidate = asObject(item)
        return candidate.type === 'function_call' && candidate.name === 'end_interview'
      }) && !endRequested) {
        endRequested = true
        cb.onEndRequested(1.5)
      }
    }

    if (type === 'error') {
      cb.onError(String(asObject(event.error).message || 'OpenAI Realtime API error'))
    }
  }

  events.onerror = () => {
    if (!closed) cb.onError('OpenAI Realtime event channel failed.')
  }
  peer.onconnectionstatechange = () => {
    if (closed) return
    if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
      cb.onError('OpenAI Realtime connection was interrupted.')
    }
    if (peer.connectionState === 'closed') cb.onClose()
  }

  try {
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${secret.value}`,
        'Content-Type': 'application/sdp',
      },
    })
    if (!response.ok) throw new Error(`OpenAI WebRTC negotiation failed (${response.status}).`)
    await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() })
  } catch (error) {
    stopMeter()
    stream?.getTracks().forEach((item) => item.stop())
    peer.close()
    throw error
  }

  return {
    setMuted: (nextMuted) => {
      muted = nextMuted
      if (track) track.enabled = !muted && !paused
    },
    setPaused: (nextPaused) => {
      paused = nextPaused
      if (track) track.enabled = !muted && !paused
      remoteAudio.muted = paused
      if (paused) remoteAudio.pause()
      else void remoteAudio.play().catch(() => {})
    },
    sendText: (value) => {
      send({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: value }] },
      })
      send({ type: 'response.create' })
    },
    sendAudio: () => {
      // Raw PCM routing is used only by the Gemini dual-live spectator engine.
    },
    stop: () => {
      if (closed) return
      closed = true
      stopMeter()
      stream?.getTracks().forEach((item) => item.stop())
      events.close()
      peer.close()
      remoteAudio.pause()
      remoteAudio.srcObject = null
      if (opened) cb.onClose()
    },
  }
}
