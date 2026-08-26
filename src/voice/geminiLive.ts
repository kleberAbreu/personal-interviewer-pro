import { GoogleGenAI, Modality, ThinkingLevel, Type, type LiveServerMessage, type Session, type UsageMetadata } from '@google/genai/web'
import { supportsAffectiveDialog, supportsVoiceReasoning } from '../config/models'
import type { VoiceReasoningMode, VoiceUsage } from '../types'
import { b64Decode, b64Encode, floatTo16BitPcmBytes, MicCapture, PcmPlayer } from './audio'
import { requestGeminiToken } from './broker'
import type { VoiceCallbacks, VoiceSession, VoiceSessionOptions } from './types'

interface ParsedGeminiMessage {
  audioChunks: string[]
  interviewerTranscript: string
  candidateTranscript: string
  interrupted: boolean
  turnComplete: boolean
  goAway: boolean
  goAwayTimeLeft?: string
  usage: VoiceUsage | null
  endInterview: boolean
  resumeHandle?: string
}

const GEMINI_THINKING_LEVEL: Record<VoiceReasoningMode, ThinkingLevel> = {
  fast: ThinkingLevel.MINIMAL,
  balanced: ThinkingLevel.LOW,
  deep: ThinkingLevel.MEDIUM,
}

export class GeminiPlaybackMicGuard {
  private userMuted = false
  private paused = false
  private playbackBlockingMic = false
  private releaseTimer: ReturnType<typeof setTimeout> | null = null
  private readonly setMicMuted: (muted: boolean) => void
  private readonly remainingSeconds: () => number

  constructor(
    setMicMuted: (muted: boolean) => void,
    remainingSeconds: () => number,
  ) {
    this.setMicMuted = setMicMuted
    this.remainingSeconds = remainingSeconds
  }

  private sync(): void {
    this.setMicMuted(this.userMuted || this.paused || this.playbackBlockingMic)
  }

  private clearReleaseTimer(): void {
    if (this.releaseTimer !== null) clearTimeout(this.releaseTimer)
    this.releaseTimer = null
  }

  blockBeforeQueueing(): void {
    this.playbackBlockingMic = true
    this.sync()
  }

  releaseAfterQueueDrains(): void {
    this.clearReleaseTimer()
    const delayMs = Math.max(0, (this.remainingSeconds() + 0.15) * 1000)
    this.releaseTimer = setTimeout(() => {
      this.releaseTimer = null
      this.playbackBlockingMic = false
      this.sync()
    }, delayMs)
  }

  releaseAfterInterruption(): void {
    this.clearReleaseTimer()
    this.playbackBlockingMic = false
    this.sync()
  }

  setUserMuted(muted: boolean): void {
    this.userMuted = muted
    this.sync()
  }

  setPaused(paused: boolean): void {
    this.paused = paused
    if (paused) {
      this.clearReleaseTimer()
    } else if (this.remainingSeconds() > 0) {
      this.playbackBlockingMic = true
      this.releaseAfterQueueDrains()
    } else {
      this.playbackBlockingMic = false
    }
    this.sync()
  }

  close(): void {
    this.clearReleaseTimer()
  }
}

function modalityTokens(details: UsageMetadata['promptTokensDetails'], modality: string): number {
  return details?.filter((item) => item.modality === modality).reduce((sum, item) => sum + (item.tokenCount ?? 0), 0) ?? 0
}

export function parseGeminiUsage(metadata: UsageMetadata | undefined): VoiceUsage | null {
  if (!metadata) return null
  const inputAudio = modalityTokens(metadata.promptTokensDetails, 'AUDIO')
  const outputAudio = modalityTokens(metadata.responseTokensDetails, 'AUDIO')
  const inputTotal = metadata.promptTokenCount ?? 0
  const outputTotal = metadata.responseTokenCount ?? 0
  return {
    inputAudioTokens: inputAudio,
    outputAudioTokens: outputAudio,
    inputTextTokens: Math.max(0, modalityTokens(metadata.promptTokensDetails, 'TEXT') || inputTotal - inputAudio),
    outputTextTokens: Math.max(0, modalityTokens(metadata.responseTokensDetails, 'TEXT') || outputTotal - outputAudio),
    cachedInputTokens: metadata.cachedContentTokenCount ?? 0,
    estimated: false,
  }
}

export function parseGeminiServerMessage(message: LiveServerMessage): ParsedGeminiMessage {
  const content = message.serverContent
  const audioChunks = (content?.modelTurn?.parts ?? [])
    .map((part) => part.inlineData?.data)
    .filter((data): data is string => Boolean(data))
  return {
    audioChunks,
    interviewerTranscript: content?.outputTranscription?.text ?? '',
    candidateTranscript: content?.inputTranscription?.text ?? '',
    interrupted: Boolean(content?.interrupted),
    turnComplete: Boolean(content?.turnComplete),
    goAway: Boolean(message.goAway),
    goAwayTimeLeft: message.goAway?.timeLeft,
    usage: parseGeminiUsage(message.usageMetadata),
    endInterview: Boolean(message.toolCall?.functionCalls?.some((call) => call.name === 'end_interview')),
    resumeHandle: message.sessionResumptionUpdate?.resumable
      ? message.sessionResumptionUpdate.newHandle
      : undefined,
  }
}

export async function startGeminiLive(
  opts: VoiceSessionOptions,
  cb: VoiceCallbacks,
): Promise<VoiceSession> {
  const credential = await requestGeminiToken(opts.model, opts.durationMinutes)
  if (Date.parse(credential.expiresAt) <= Date.now()) throw new Error('VOICE_CREDENTIAL_EXPIRED')
  const ai = new GoogleGenAI({ apiKey: credential.token, httpOptions: { apiVersion: 'v1beta' } })
  const mic = new MicCapture()
  const player = new PcmPlayer(24000)
  let closed = false
  let endRequested = false
  let kickoffSent = false
  let reconnecting = false
  let suppressNextClose = false
  let micStarted = false
  let session: Session | null = null
  let connectingSession: Promise<Session> | null = null
  let resumeHandle: string | undefined
  let pendingInterviewer = ''
  let pendingCandidate = ''
  let fallbackInputTokens = 0
  let fallbackOutputTokens = 0
  let turnHadUsage = false
  const playbackMicGuard = new GeminiPlaybackMicGuard(
    (muted) => { mic.muted = muted },
    () => player.remainingSeconds(),
  )

  const flushTranscripts = () => {
    if (pendingInterviewer.trim()) cb.onTranscript('interviewer', pendingInterviewer.trim())
    if (pendingCandidate.trim()) cb.onTranscript('candidate', pendingCandidate.trim())
    pendingInterviewer = ''
    pendingCandidate = ''
  }

  const flushFallbackUsage = () => {
    if (!turnHadUsage && (fallbackInputTokens > 0 || fallbackOutputTokens > 0)) {
      cb.onUsage({
        inputAudioTokens: Math.round(fallbackInputTokens),
        outputAudioTokens: Math.round(fallbackOutputTokens),
        inputTextTokens: 0,
        outputTextTokens: 0,
        cachedInputTokens: 0,
        estimated: true,
      })
    }
    fallbackInputTokens = 0
    fallbackOutputTokens = 0
    turnHadUsage = false
  }

  const startMic = () => {
    if (opts.captureMic === false || micStarted) return
    micStarted = true
    void mic.start(16000, (chunk, durationSec) => {
      fallbackInputTokens += durationSec * 25
      let sum = 0
      for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i]
      cb.onAudioLevel(Math.sqrt(sum / chunk.length))
      if (!session || reconnecting) return
      const data = b64Encode(floatTo16BitPcmBytes(chunk))
      try {
        session.sendRealtimeInput({ audio: { data, mimeType: 'audio/pcm;rate=16000' } })
      } catch {
        // A frame can be dropped while a resumable connection is being swapped.
      }
    }).catch((error: unknown) => cb.onError(error instanceof Error ? error.message : 'Could not access the microphone'))
  }

  const reconnectAfterGoAway = (timeLeft?: string) => {
    if (closed || reconnecting || endRequested) return
    if (!resumeHandle) {
      cb.onError('Gemini cannot resume this session because no resume handle was provided.')
      return
    }
    reconnecting = true
    suppressNextClose = true
    flushTranscripts()
    flushFallbackUsage()
    const oldSession = session
    session = null
    try { oldSession?.close() } catch { /* already closing */ }
    void connectSession().catch((error: unknown) => {
      const suffix = timeLeft ? ` (${timeLeft})` : ''
      cb.onError(`${error instanceof Error ? error.message : 'Could not resume Gemini Live'}${suffix}`)
    })
  }

  const connectSession = async () => {
    if (Date.parse(credential.expiresAt) <= Date.now()) throw new Error('VOICE_CREDENTIAL_EXPIRED')
    const modelRef = { provider: 'gemini' as const, model: opts.model }
    let currentPromise: Promise<Session> | null = null

    currentPromise = ai.live.connect({
      model: opts.model,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voiceName } } },
        ...(supportsVoiceReasoning(modelRef)
          ? { thinkingConfig: { thinkingLevel: GEMINI_THINKING_LEVEL[opts.reasoningMode] } }
          : {}),
        ...(supportsAffectiveDialog(modelRef) && opts.expressiveness === 'expressive'
          ? { enableAffectiveDialog: true }
          : {}),
        systemInstruction: opts.systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        sessionResumption: { handle: resumeHandle },
        contextWindowCompression: { slidingWindow: {} },
        ...(opts.enableEndTool === false ? {} : {
          tools: [{
            functionDeclarations: [{
              name: 'end_interview',
              description: 'Call immediately after the final goodbye when the interview is complete.',
              parameters: { type: Type.OBJECT, properties: {} },
            }],
          }],
        }),
      },
      callbacks: {
        onopen: () => {
          if (closed) return
          cb.onOpen()
          if (opts.kickoff !== false && !kickoffSent) {
            kickoffSent = true
            currentPromise
              ?.then((activeSession) => activeSession.sendRealtimeInput({
                text: opts.language === 'en-US'
                  ? 'The candidate has joined. Greet them and start the interview.'
                  : 'O candidato entrou. Cumprimente-o e inicie a entrevista.',
              }))
              .catch(() => cb.onError('Gemini could not start the interview.'))
          }
          startMic()
        },
        onmessage: (message: LiveServerMessage) => {
          if (closed) return
          const parsed = parseGeminiServerMessage(message)
          if (parsed.resumeHandle) resumeHandle = parsed.resumeHandle
          if (parsed.goAway) {
            reconnectAfterGoAway(parsed.goAwayTimeLeft)
            return
          }

          for (const encodedAudio of parsed.audioChunks) {
            const bytes = b64Decode(encodedAudio)
            fallbackOutputTokens += (bytes.length / 2 / 24000) * 25
            // Gemini playback is client-managed PCM. Prevent the speaker output
            // from re-entering the microphone and falsely interrupting the next
            // response; release the input as soon as the playback queue drains.
            playbackMicGuard.blockBeforeQueueing()
            player.playPcm16(bytes)
            playbackMicGuard.releaseAfterQueueDrains()
            cb.onAudioChunk?.(bytes)
          }
          pendingInterviewer += parsed.interviewerTranscript
          pendingCandidate += parsed.candidateTranscript
          if (parsed.usage) {
            turnHadUsage = true
            cb.onUsage(parsed.usage)
          }
          if (parsed.interrupted) {
            player.interrupt()
            playbackMicGuard.releaseAfterInterruption()
          }
          if (parsed.turnComplete) {
            flushTranscripts()
            flushFallbackUsage()
            cb.onTurnComplete?.()
          }
          if (parsed.endInterview && !endRequested) {
            endRequested = true
            flushTranscripts()
            flushFallbackUsage()
            cb.onEndRequested(player.remainingSeconds())
          }
        },
        onerror: (event: ErrorEvent) => {
          if (!closed && !reconnecting) cb.onError(event.message || 'Gemini Live connection error.')
        },
        onclose: (event: CloseEvent) => {
          if (suppressNextClose) {
            suppressNextClose = false
            return
          }
          playbackMicGuard.close()
          mic.stop()
          session = null
          if (!closed) {
            if (!endRequested && event.reason) cb.onError(`Gemini closed the session (${event.code}).`)
            cb.onClose()
          }
        },
      },
    })

    connectingSession = currentPromise
    const nextSession = await currentPromise
    if (closed) {
      try { nextSession.close() } catch { /* already closed */ }
      return
    }
    session = nextSession
    reconnecting = false
  }

  await connectSession()

  return {
    setMuted: (muted) => {
      playbackMicGuard.setUserMuted(muted)
    },
    setPaused: (nextPaused) => {
      if (nextPaused) {
        player.pause()
      } else {
        player.resume()
      }
      playbackMicGuard.setPaused(nextPaused)
    },
    sendText: (text) => {
      session?.sendRealtimeInput({ text })
    },
    sendAudio: (pcm16kBytes) => {
      fallbackInputTokens += (pcm16kBytes.length / 2 / 16000) * 25
      session?.sendRealtimeInput({
        audio: { data: b64Encode(pcm16kBytes), mimeType: 'audio/pcm;rate=16000' },
      })
    },
    stop: () => {
      closed = true
      playbackMicGuard.close()
      flushTranscripts()
      flushFallbackUsage()
      mic.stop()
      player.close()
      try { session?.close() } catch { /* already closed */ }
      session = null
      connectingSession?.then((activeSession) => activeSession.close()).catch(() => {})
    },
  }
}
