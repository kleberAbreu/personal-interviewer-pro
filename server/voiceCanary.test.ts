import { config } from 'dotenv'
import { describe, expect, it } from 'vitest'

config({ path: '.env.local', quiet: true })

const runCanaries = process.env.RUN_VOICE_E2E === '1'

describe.skipIf(!runCanaries || !process.env.OPENAI_API_KEY)('OpenAI voice credential canaries', () => {
  it.each(['gpt-realtime-2.1', 'gpt-realtime-2.1-mini', 'gpt-realtime-1.5'])('mints a client secret for %s', async (model) => {
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Safety-Identifier': 'intreviewr-pro-local-canary',
      },
      body: JSON.stringify({ session: { type: 'realtime', model, audio: { output: { voice: 'marin' } } } }),
    })
    const body = await response.json() as { value?: string }
    expect(response.ok).toBe(true)
    expect(body.value).toBeTruthy()
  }, 30_000)
})

describe.skipIf(!runCanaries || !process.env.GEMINI_API_KEY)('Gemini voice credential canaries', () => {
  it.each(['gemini-3.1-flash-live-preview', 'gemini-2.5-flash-native-audio-preview-12-2025'])('mints a constrained token for %s', async (model) => {
    const now = Date.now()
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uses: 1,
        expireTime: new Date(now + 15 * 60_000).toISOString(),
        newSessionExpireTime: new Date(now + 60_000).toISOString(),
        liveConnectConstraints: { model: `models/${model}` },
      }),
    })
    const body = await response.json() as { name?: string }
    expect(response.ok).toBe(true)
    expect(body.name).toBeTruthy()
  }, 30_000)
})
