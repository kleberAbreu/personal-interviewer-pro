import { sanitizeErrorMessage } from '../lib/errors'

export interface VoiceBrokerStatus {
  openai: boolean
  gemini: boolean
}

export interface VoiceCredentialUpdate {
  openai?: string | null
  gemini?: string | null
}

interface OpenAiSecretResponse {
  value: string
  expiresAt: number
}

interface GeminiTokenResponse {
  token: string
  expiresAt: string
}

async function brokerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new Error('VOICE_BROKER_UNAVAILABLE')
  }

  const body = await response.json().catch(() => ({})) as { error?: string } & T
  if (!response.ok) {
    throw new Error(sanitizeErrorMessage(body.error || `Voice broker request failed (${response.status})`))
  }
  return body
}

export function getVoiceBrokerStatus(): Promise<VoiceBrokerStatus> {
  return brokerRequest<VoiceBrokerStatus>('/api/voice/status')
}

export function updateVoiceCredentials(update: VoiceCredentialUpdate): Promise<VoiceBrokerStatus> {
  return brokerRequest<VoiceBrokerStatus>('/api/voice/credentials', {
    method: 'POST',
    body: JSON.stringify(update),
  })
}

export function requestOpenAiClientSecret(model: string, voice: string): Promise<OpenAiSecretResponse> {
  return brokerRequest<OpenAiSecretResponse>('/api/voice/openai/client-secret', {
    method: 'POST',
    body: JSON.stringify({ model, voice }),
  })
}

export function requestGeminiToken(model: string, durationMinutes: number): Promise<GeminiTokenResponse> {
  return brokerRequest<GeminiTokenResponse>('/api/voice/gemini/token', {
    method: 'POST',
    body: JSON.stringify({ model, durationMinutes }),
  })
}
