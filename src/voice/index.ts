import type { ModelRef } from '../types'
import { startGeminiLive } from './geminiLive'
import type { VoiceCallbacks, VoiceSession, VoiceSessionOptions } from './types'

export type { VoiceCallbacks, VoiceSession, VoiceSessionOptions } from './types'

export function startVoiceSession(
  ref: ModelRef,
  opts: VoiceSessionOptions,
  cb: VoiceCallbacks,
): Promise<VoiceSession> {
  if (ref.provider === 'gemini') return startGeminiLive(opts, cb)
  return Promise.reject(
    new Error('O entrevistador por voz requer um modelo Gemini Live. Ajuste em Configurações → Modelos.'),
  )
}
