import { runCandidateTurn } from '../agents/candidate'
import { ttsCostUsd } from '../services/cost'
import type { ApiKeys, InterviewConfig, ModelRef, TranscriptEntry } from '../types'
import { startVoiceSession } from './index'
import { TtsSpeaker } from './tts'
import type { VoiceSession } from './types'

// Orquestrador do modo espectador (IA vs IA):
//
//   Entrevistador (Gemini Live) fala em áudio → turnComplete
//        → Candidata (LLM via OpenRouter) gera a resposta em texto
//        → TTS fala a resposta para o usuário ouvir
//        → o texto entra na sessão Live como fala do candidato
//        → entrevistador continua … até chamar end_interview.

export type SpectatorPhase =
  | 'connecting'
  | 'interviewer-speaking'
  | 'thinking'
  | 'candidate-speaking'
  | 'failed'
  | 'ended'

export interface SpectatorOptions {
  config: InterviewConfig
  keys: ApiKeys
  /** Modelo do entrevistador (Gemini Live). */
  interviewerRef: ModelRef
  /** Modelo da candidata (OpenRouter). */
  candidateRef: ModelRef
  /** Prompt do entrevistador já montado (buildInterviewerPrompt). */
  systemInstruction: string
  ttsModel: string
  candidateVoice: string
}

export interface SpectatorCallbacks {
  onPhase: (phase: SpectatorPhase) => void
  onTranscript: (entry: TranscriptEntry) => void
  /** Custo incremental da candidata (tokens LLM + áudio TTS), em USD. */
  onCandidateCost: (usd: number) => void
  /** Segundos de áudio da sessão Live (para custo de voz do entrevistador). */
  onAudioSeconds: (inputDelta: number, outputDelta: number) => void
  onError: (message: string) => void
  /** Entrevistador encerrou via tool end_interview. delaySec = áudio restante. */
  onEndRequested: (delaySec: number) => void
  onClose: () => void
}

export interface SpectatorSession {
  setPaused: (paused: boolean) => void
  /** Re-tenta o turno da candidata após uma falha (phase 'failed'). */
  retryCandidate: () => void
  getTranscript: () => TranscriptEntry[]
  stop: () => void
}

export async function startSpectatorSession(
  opts: SpectatorOptions,
  cb: SpectatorCallbacks,
): Promise<SpectatorSession> {
  const transcript: TranscriptEntry[] = []
  const tts = new TtsSpeaker()
  let voice: VoiceSession | null = null
  let stopped = false
  let ended = false
  let responding = false

  cb.onPhase('connecting')

  const pushEntry = (role: TranscriptEntry['role'], text: string) => {
    const entry: TranscriptEntry = { role, text, at: Date.now() }
    transcript.push(entry)
    cb.onTranscript(entry)
  }

  // Turno da candidata: LLM → transcrição → TTS (ouvinte) → texto na sessão Live.
  const respond = async () => {
    if (stopped || ended || responding) return
    const last = transcript[transcript.length - 1]
    if (!last || last.role !== 'interviewer') return

    responding = true
    cb.onPhase('thinking')
    try {
      const result = await runCandidateTurn(opts.config, transcript, opts.candidateRef, opts.keys)
      if (stopped || ended) return
      cb.onCandidateCost(result.costUsd)
      pushEntry('candidate', result.data)

      cb.onPhase('candidate-speaking')
      try {
        const seconds = await tts.speak({
          apiKey: opts.keys.gemini,
          model: opts.ttsModel,
          voiceName: opts.candidateVoice,
          text: result.data,
        })
        cb.onCandidateCost(ttsCostUsd(seconds))
      } catch (e) {
        // TTS é só para os SEUS ouvidos: se falhar, a entrevista segue sem a voz.
        console.warn('[spectator] TTS falhou; seguindo sem áudio da candidata:', e)
      }

      if (stopped || ended) return
      voice?.sendText(result.data)
      cb.onPhase('interviewer-speaking')
    } catch (e) {
      cb.onPhase('failed')
      cb.onError(e instanceof Error ? e.message : 'Falha ao gerar a resposta da IA Candidata.')
    } finally {
      responding = false
    }
  }

  voice = await startVoiceSession(opts.interviewerRef, {
    apiKey: opts.keys.gemini,
    model: opts.interviewerRef.model,
    voiceName: opts.config.voiceName,
    systemInstruction: opts.systemInstruction,
    language: opts.config.interviewLanguage,
    captureMic: false,
  }, {
    onOpen: () => { if (!stopped) cb.onPhase('interviewer-speaking') },
    onAudioLevel: () => {},
    onTranscript: (role, text) => { if (!stopped) pushEntry(role, text) },
    onTurnComplete: () => { void respond() },
    onAudioSeconds: cb.onAudioSeconds,
    onEndRequested: (delaySec) => {
      ended = true
      cb.onPhase('ended')
      cb.onEndRequested(delaySec)
    },
    onError: (message) => { if (!stopped) cb.onError(message) },
    onClose: () => { if (!stopped) cb.onClose() },
  })

  return {
    setPaused: (paused) => {
      voice?.setPaused(paused)
      if (paused) tts.pause()
      else tts.resume()
    },
    retryCandidate: () => { void respond() },
    getTranscript: () => [...transcript],
    stop: () => {
      stopped = true
      tts.close()
      voice?.stop()
    },
  }
}
