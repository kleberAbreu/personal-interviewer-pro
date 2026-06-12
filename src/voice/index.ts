import type { ModelRef } from '../types'
import { startGeminiLive } from './geminiLive'
import { startOpenAiRealtime } from './openaiRealtime'
import type { VoiceCallbacks, VoiceSession, VoiceSessionOptions } from './types'

export type { VoiceCallbacks, VoiceSession, VoiceSessionOptions } from './types'

export function startVoiceSession(
  ref: ModelRef,
  opts: VoiceSessionOptions,
  cb: VoiceCallbacks,
): Promise<VoiceSession> {
  if (ref.provider === 'openai') return startOpenAiRealtime(opts, cb)
  if (ref.provider === 'gemini') return startGeminiLive(opts, cb)
  return Promise.reject(
    new Error('O entrevistador por voz requer um modelo Gemini Live ou OpenAI Realtime. Ajuste em Configurações → Modelos.'),
  )
}
