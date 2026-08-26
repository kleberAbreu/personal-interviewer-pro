import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { CANDIDATE_TTS_MODELS, CATALOG, GEMINI_VOICES, voicesForModel } from '../src/config/models'

const MAX_BODY_BYTES = 8_192
const OPENAI_MODELS = new Set(
  CATALOG.filter((model) => model.provider === 'openai' && model.voice).map((model) => model.id),
)
const GEMINI_MODELS = new Set(
  CATALOG.filter((model) => model.provider === 'gemini' && model.voice).map((model) => model.id),
)
const GEMINI_TTS_MODELS = new Set<string>(CANDIDATE_TTS_MODELS.map((model) => model.id))
const GEMINI_TTS_VOICES = new Set<string>(GEMINI_VOICES)

export interface BrokerEnvironment {
  OPENAI_API_KEY?: string
  GEMINI_API_KEY?: string
}

export interface VoiceCredentialUpdate {
  openai?: string | null
  gemini?: string | null
}

export interface VoiceBrokerOptions {
  envFilePath?: string
}

const VOICE_ENV_KEYS = {
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
} as const

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

export function validateVoiceCredentialUpdate(value: unknown): VoiceCredentialUpdate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Voice credential update must be a JSON object.')
  }
  const body = value as Record<string, unknown>
  const allowedProviders = Object.keys(VOICE_ENV_KEYS) as Array<keyof VoiceCredentialUpdate>
  const unknownFields = Object.keys(body).filter((key) => !allowedProviders.includes(key as keyof VoiceCredentialUpdate))
  if (unknownFields.length) throw new Error('Voice credential update contains unsupported fields.')

  const provided = allowedProviders.filter((provider) => hasOwn(body, provider))
  if (!provided.length) throw new Error('Provide an OpenAI or Gemini credential update.')

  const result: VoiceCredentialUpdate = {}
  for (const provider of provided) {
    const raw = body[provider]
    if (raw === null) {
      result[provider] = null
      continue
    }
    if (typeof raw !== 'string') throw new Error(`Invalid ${provider} API key format.`)
    const apiKey = raw.trim()
    if (apiKey.length < 20 || apiKey.length > 512 || !/^[A-Za-z0-9._-]+$/.test(apiKey)) {
      throw new Error(`Invalid ${provider} API key format.`)
    }
    result[provider] = apiKey
  }
  return result
}

function updateEnvFile(content: string, envKey: string, value: string | null): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const pattern = new RegExp(`^\\s*(?:export\\s+)?${envKey}\\s*=`)
  const next: string[] = []
  let written = false

  for (const line of lines) {
    if (!pattern.test(line)) {
      next.push(line)
      continue
    }
    if (value !== null && !written) {
      next.push(`${envKey}=${value}`)
      written = true
    }
  }

  while (next.at(-1) === '') next.pop()
  if (value !== null && !written) {
    if (next.length) next.push('')
    next.push(`${envKey}=${value}`)
  }
  return `${next.join('\n')}\n`
}

async function persistVoiceCredentials(envFilePath: string, update: VoiceCredentialUpdate): Promise<void> {
  let content: string
  try {
    content = await readFile(envFilePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new Error('Voice credentials could not be saved locally.', { cause: error })
    }
    content = '# Voice credentials managed by Personal Interviewer Pro.\n'
  }

  for (const provider of Object.keys(update) as Array<keyof VoiceCredentialUpdate>) {
    const value = update[provider]
    if (value !== undefined) content = updateEnvFile(content, VOICE_ENV_KEYS[provider], value)
  }

  await mkdir(dirname(envFilePath), { recursive: true })
  const tempPath = `${envFilePath}.${process.pid}.${Date.now()}.tmp`
  try {
    await writeFile(tempPath, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    await chmod(tempPath, 0o600)
    await rename(tempPath, envFilePath)
    await chmod(envFilePath, 0o600)
  } catch (error) {
    throw new Error('Voice credentials could not be saved locally.', { cause: error })
  } finally {
    await rm(tempPath, { force: true }).catch(() => {})
  }
}

function voiceStatus(env: BrokerEnvironment) {
  return { openai: Boolean(env.OPENAI_API_KEY), gemini: Boolean(env.GEMINI_API_KEY) }
}

export function validateOpenAiRequest(value: unknown): { model: string; voice: string } {
  const body = value as { model?: unknown; voice?: unknown }
  if (typeof body?.model !== 'string' || !OPENAI_MODELS.has(body.model)) {
    throw new Error('Unsupported OpenAI Realtime model.')
  }
  if (typeof body.voice !== 'string' || !voicesForModel({ provider: 'openai', model: body.model }).includes(body.voice)) {
    throw new Error('Unsupported voice for the selected OpenAI model.')
  }
  return { model: body.model, voice: body.voice }
}

export function validateGeminiRequest(value: unknown): { model: string; durationMinutes: number } {
  const body = value as { model?: unknown; durationMinutes?: unknown }
  if (typeof body?.model !== 'string' || !GEMINI_MODELS.has(body.model)) {
    throw new Error('Unsupported Gemini Live model.')
  }
  if (typeof body.durationMinutes !== 'number' || ![15, 30, 45].includes(body.durationMinutes)) {
    throw new Error('Interview duration must be 15, 30, or 45 minutes.')
  }
  return { model: body.model, durationMinutes: body.durationMinutes }
}

export function validateGeminiTtsRequest(value: unknown): { model: string; voiceName: string; text: string } {
  const body = value as { model?: unknown; voiceName?: unknown; text?: unknown }
  if (typeof body?.model !== 'string' || !GEMINI_TTS_MODELS.has(body.model)) {
    throw new Error('Unsupported Gemini TTS model.')
  }
  if (typeof body.voiceName !== 'string' || !GEMINI_TTS_VOICES.has(body.voiceName)) {
    throw new Error('Unsupported Gemini TTS voice.')
  }
  if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 8_000) {
    throw new Error('TTS text must contain between 1 and 8000 characters.')
  }
  return { model: body.model, voiceName: body.voiceName, text: body.text.trim() }
}

export function buildGeminiAuthTokenRequest(
  model: string,
  durationMinutes: number,
  now = Date.now(),
) {
  return {
    uses: 1,
    expireTime: new Date(now + (durationMinutes + 10) * 60_000).toISOString(),
    newSessionExpireTime: new Date(now + 60_000).toISOString(),
    // The current AuthToken schema replaced liveConnectConstraints with a
    // BidiGenerateContentSetup plus a field mask. Lock only the model so the
    // browser can still supply voice, instructions, transcripts, and tools.
    fieldMask: 'model',
    bidiGenerateContentSetup: { model: `models/${model}` },
  }
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(value))
}

function isLoopbackOrigin(origin: string | undefined): boolean {
  if (!origin) return true
  try {
    const host = new URL(origin).hostname
    return host === '127.0.0.1' || host === 'localhost' || host === '[::1]'
  } catch {
    return false
  }
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new Error('Request body is too large.')
    chunks.push(buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw new Error('Request body must be valid JSON.')
  }
}

async function createOpenAiSecret(env: BrokerEnvironment, value: unknown): Promise<{ value: string; expiresAt: number }> {
  if (!env.OPENAI_API_KEY) throw new Error('OpenAI voice is not configured in .env.local.')
  const { model, voice } = validateOpenAiRequest(value)
  const providerResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Safety-Identifier': 'intreviewr-pro-local',
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model,
        audio: { output: { voice } },
      },
    }),
  })
  const body = await providerResponse.json().catch(() => ({})) as { value?: string; expires_at?: number }
  if (!providerResponse.ok || !body.value || !body.expires_at) {
    throw new Error('OpenAI could not create an ephemeral voice credential.')
  }
  return { value: body.value, expiresAt: body.expires_at }
}

async function createGeminiToken(env: BrokerEnvironment, value: unknown): Promise<{ token: string; expiresAt: string }> {
  if (!env.GEMINI_API_KEY) throw new Error('Gemini voice is not configured in .env.local.')
  const { model, durationMinutes } = validateGeminiRequest(value)
  const tokenRequest = buildGeminiAuthTokenRequest(model, durationMinutes)
  const providerResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify(tokenRequest),
  })
  const body = await providerResponse.json().catch(() => ({})) as { name?: string; expireTime?: string }
  if (!providerResponse.ok || !body.name) {
    throw new Error('Gemini could not create an ephemeral voice credential.')
  }
  return { token: body.name, expiresAt: body.expireTime ?? tokenRequest.expireTime }
}

async function createGeminiSpeech(env: BrokerEnvironment, value: unknown): Promise<{ audio: string }> {
  if (!env.GEMINI_API_KEY) throw new Error('Gemini voice is not configured in .env.local.')
  const { model, voiceName, text } = validateGeminiTtsRequest(value)
  const providerResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      }),
    },
  )
  const body = await providerResponse.json().catch(() => ({})) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>
  }
  const audio = body.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData?.data
  if (!providerResponse.ok || !audio) throw new Error('Gemini could not synthesize candidate speech.')
  return { audio }
}

export function createVoiceBroker(
  env: BrokerEnvironment = process.env,
  options: VoiceBrokerOptions = {},
) {
  const envFilePath = options.envFilePath ?? resolve(process.cwd(), '.env.local')
  let credentialUpdateQueue: Promise<void> = Promise.resolve()

  const updateVoiceCredentials = (value: unknown) => {
    const update = validateVoiceCredentialUpdate(value)
    const task = credentialUpdateQueue.then(async () => {
      await persistVoiceCredentials(envFilePath, update)
      for (const provider of Object.keys(update) as Array<keyof VoiceCredentialUpdate>) {
        const envKey = VOICE_ENV_KEYS[provider]
        const apiKey = update[provider]
        if (apiKey === null) delete env[envKey]
        else if (apiKey !== undefined) env[envKey] = apiKey
      }
    })
    credentialUpdateQueue = task.catch(() => {})
    return task.then(() => voiceStatus(env))
  }

  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    if (!isLoopbackOrigin(request.headers.origin)) {
      sendJson(response, 403, { error: 'Voice broker accepts only local origins.' })
      return
    }

    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
    try {
      if (request.method === 'GET' && path === '/api/voice/status') {
        sendJson(response, 200, voiceStatus(env))
        return
      }
      if (request.method === 'POST' && path === '/api/voice/credentials') {
        sendJson(response, 200, await updateVoiceCredentials(await readJson(request)))
        return
      }
      if (request.method === 'POST' && path === '/api/voice/openai/client-secret') {
        sendJson(response, 200, await createOpenAiSecret(env, await readJson(request)))
        return
      }
      if (request.method === 'POST' && path === '/api/voice/gemini/token') {
        sendJson(response, 200, await createGeminiToken(env, await readJson(request)))
        return
      }
      if (request.method === 'POST' && path === '/api/voice/gemini/tts') {
        sendJson(response, 200, await createGeminiSpeech(env, await readJson(request)))
        return
      }
      sendJson(response, 404, { error: 'Voice broker endpoint not found.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voice broker request failed.'
      const status = message.includes('not configured')
        ? 503
        : message.includes('could not be saved') ? 500 : 400
      sendJson(response, status, { error: message })
    }
  })
}
