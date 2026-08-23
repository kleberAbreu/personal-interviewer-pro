import type { ModelRef } from '../types'
import { modelInfo } from '../config/models'
import { startGeminiLive } from './geminiLive'
import { startOpenAiRealtime } from './openaiRealtime'
import type { VoiceCallbacks, VoiceSession, VoiceSessionOptions } from './types'

export type { VoiceCallbacks, VoiceSession, VoiceSessionOptions } from './types'

export function startVoiceSession(
  ref: ModelRef,
  opts: VoiceSessionOptions,
  cb: VoiceCallbacks,
): Promise<VoiceSession> {
  if (!modelInfo(ref)?.voice) {
    return Promise.reject(new Error('The selected model does not support a live voice interview.'))
  }
  if (ref.provider === 'openai') return startOpenAiRealtime(opts, cb)
  if (ref.provider === 'gemini') return startGeminiLive(opts, cb)
  return Promise.reject(
    new Error('The voice interviewer requires a Gemini Live or OpenAI Realtime model. Adjust this in Settings -> Models.'),
  )
}
