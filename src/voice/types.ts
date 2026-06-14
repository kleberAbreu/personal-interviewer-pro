import type { Language } from '../types'

export interface VoiceSessionOptions {
  apiKey: string
  model: string
  voiceName: string
  systemInstruction: string
  language: Language
}

export interface VoiceCallbacks {
  onOpen: () => void
  onAudioLevel: (level: number) => void
  onTranscript: (role: 'interviewer' | 'candidate', text: string) => void
  /** Modelo pediu encerramento (tool end_interview). delaySec = áudio restante a tocar. */
  onEndRequested: (delaySec: number) => void
  onError: (message: string) => void
  onClose: () => void
  /** Segundos de áudio processados desde o último callback (para custo). */
  onAudioSeconds: (inputDelta: number, outputDelta: number) => void
}

export interface VoiceSession {
  setMuted: (muted: boolean) => void
  /** Pausa/retoma sem perder contexto: não envia microfone e suspende o áudio. */
  setPaused: (paused: boolean) => void
  stop: () => void
}
