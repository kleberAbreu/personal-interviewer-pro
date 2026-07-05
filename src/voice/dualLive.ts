import { candidatePrompt } from '../config/prompts'
import type { TranscriptEntry } from '../types'
import { resamplePcm16 } from './audio'
import { startGeminiLive } from './geminiLive'
import type { SpectatorCallbacks, SpectatorOptions, SpectatorSession } from './spectator'
import type { VoiceSession } from './types'

// Engine B (EXPERIMENTAL): duas sessões Gemini Live conversando áudio-a-áudio.
//
//   Entrevistador (Live) ──24kHz──► resample 16kHz ──► input da Candidata (Live)
//   Candidata (Live)     ──24kHz──► resample 16kHz ──► input do Entrevistador
//
// Você ouve os dois players locais. A transcrição vem SOMENTE da sessão do
// entrevistador (output = entrevistador, input = candidata), evitando duplicatas.
// A candidata usa o MESMO modelo Live do entrevistador, com voz própria e a
// persona do CV. Custos: ambas as saídas de áudio são reportadas; o áudio
// roteado conta como input na sessão que o recebe.

export async function startDualLiveSession(
  opts: SpectatorOptions,
  cb: SpectatorCallbacks,
): Promise<SpectatorSession> {
  const transcript: TranscriptEntry[] = []
  let interviewer: VoiceSession | null = null
  let candidate: VoiceSession | null = null
  let stopped = false
  let ended = false

  cb.onPhase('connecting')

  // Quem emitiu áudio por último está "falando".
  const markSpeaking = (who: 'interviewer-speaking' | 'candidate-speaking') => {
    if (stopped || ended) return
    cb.onPhase(who)
  }

  const candidateSystem = candidatePrompt({
    language: opts.config.interviewLanguage,
    area: opts.config.customArea || opts.config.area,
    interviewType: opts.config.interviewType,
    stressMode: opts.config.stressMode,
    jobDescription: opts.config.jobDescription,
    cvText: opts.config.cvText,
  })

  // Sessão da CANDIDATA: sem kickoff, sem tool de encerramento, sem microfone.
  // Ignoramos as transcrições dela (a sessão do entrevistador cobre os dois lados).
  candidate = await startGeminiLive({
    apiKey: opts.keys.gemini,
    model: opts.interviewerRef.model,
    voiceName: opts.candidateVoice,
    systemInstruction: candidateSystem,
    language: opts.config.interviewLanguage,
    captureMic: false,
    kickoff: false,
    enableEndTool: false,
  }, {
    onOpen: () => {},
    onAudioLevel: () => {},
    onTranscript: () => {},
    onAudioChunk: (bytes) => {
      markSpeaking('candidate-speaking')
      // Voz da candidata vira input de áudio do entrevistador.
      cb.onAudioSeconds(bytes.length / 2 / 24000, 0)
      interviewer?.sendAudio(resamplePcm16(bytes, 24000, 16000))
    },
    onAudioSeconds: (_inDelta, outDelta) => cb.onAudioSeconds(0, outDelta),
    onEndRequested: () => {},
    onError: (msg) => { if (!stopped && !ended) cb.onError(`[candidata] ${msg}`) },
    onClose: () => { if (!stopped && !ended) cb.onError('A sessão de voz da candidata foi encerrada.') },
  })

  // Sessão do ENTREVISTADOR: idêntica ao modo normal, mas sem microfone.
  interviewer = await startGeminiLive({
    apiKey: opts.keys.gemini,
    model: opts.interviewerRef.model,
    voiceName: opts.config.voiceName,
    systemInstruction: opts.systemInstruction,
    language: opts.config.interviewLanguage,
    captureMic: false,
  }, {
    onOpen: () => { if (!stopped) cb.onPhase('interviewer-speaking') },
    onAudioLevel: () => {},
    onTranscript: (role, text) => {
      if (stopped) return
      const entry = { role, text, at: Date.now() }
      transcript.push(entry)
      cb.onTranscript(entry)
    },
    onAudioChunk: (bytes) => {
      markSpeaking('interviewer-speaking')
      // Voz do entrevistador vira input de áudio da candidata.
      candidate?.sendAudio(resamplePcm16(bytes, 24000, 16000))
    },
    onAudioSeconds: cb.onAudioSeconds,
    onEndRequested: (delaySec) => {
      ended = true
      cb.onPhase('ended')
      cb.onEndRequested(delaySec)
    },
    onError: (msg) => { if (!stopped) cb.onError(msg) },
    onClose: () => { if (!stopped) cb.onClose() },
  })

  return {
    setPaused: (paused) => {
      interviewer?.setPaused(paused)
      candidate?.setPaused(paused)
    },
    // Dual-live não tem turno discreto para re-tentar; a conversa é contínua.
    retryCandidate: () => {},
    getTranscript: () => [...transcript],
    stop: () => {
      stopped = true
      candidate?.stop()
      interviewer?.stop()
    },
  }
}
