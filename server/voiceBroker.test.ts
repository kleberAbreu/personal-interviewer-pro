import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createVoiceBroker,
  buildGeminiAuthTokenRequest,
  validateGeminiRequest,
  validateGeminiTtsRequest,
  validateOpenAiRequest,
  validateVoiceCredentialUpdate,
} from './voiceBroker'

const tempDirectories: string[] = []

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((path) => rm(path, { force: true, recursive: true })))
})

describe('voice broker validation', () => {
  it('uses the current Gemini AuthToken schema while locking only the Live model', () => {
    const request = buildGeminiAuthTokenRequest('gemini-3.1-flash-live-preview', 30, 0)
    expect(request).toMatchObject({
      uses: 1,
      fieldMask: 'model',
      bidiGenerateContentSetup: { model: 'models/gemini-3.1-flash-live-preview' },
    })
    expect(request).not.toHaveProperty('liveConnectConstraints')
    expect(Date.parse(request.newSessionExpireTime)).toBe(60_000)
    expect(Date.parse(request.expireTime)).toBe(40 * 60_000)
  })

  it('accepts supported model and voice combinations', () => {
    expect(validateOpenAiRequest({ model: 'gpt-realtime-2.1', voice: 'marin' })).toEqual({
      model: 'gpt-realtime-2.1', voice: 'marin',
    })
    expect(validateGeminiRequest({ model: 'gemini-3.1-flash-live-preview', durationMinutes: 30 })).toEqual({
      model: 'gemini-3.1-flash-live-preview', durationMinutes: 30,
    })
    expect(validateGeminiTtsRequest({ model: 'gemini-2.5-flash-tts', voiceName: 'Puck', text: 'Hello' })).toEqual({
      model: 'gemini-2.5-flash-tts', voiceName: 'Puck', text: 'Hello',
    })
  })

  it('rejects unknown models, incompatible voices, and invalid durations', () => {
    expect(() => validateOpenAiRequest({ model: 'gpt-realtime', voice: 'marin' })).toThrow('Unsupported')
    expect(() => validateOpenAiRequest({ model: 'gpt-realtime-2.1', voice: 'Kore' })).toThrow('Unsupported voice')
    expect(() => validateGeminiRequest({ model: 'gemini-3.1-flash-live-preview', durationMinutes: 120 })).toThrow('duration')
    expect(() => validateGeminiTtsRequest({ model: 'unknown', voiceName: 'Puck', text: 'Hello' })).toThrow('TTS model')
    expect(() => validateGeminiTtsRequest({ model: 'gemini-2.5-flash-tts', voiceName: 'unknown', text: 'Hello' })).toThrow('TTS voice')
    expect(() => validateGeminiTtsRequest({ model: 'gemini-2.5-flash-tts', voiceName: 'Puck', text: '' })).toThrow('text')
  })

  it('accepts only explicit OpenAI and Gemini credential updates', () => {
    expect(validateVoiceCredentialUpdate({
      openai: 'openai_test_credential_1234567890',
      gemini: null,
    })).toEqual({
      openai: 'openai_test_credential_1234567890',
      gemini: null,
    })
    expect(() => validateVoiceCredentialUpdate({})).toThrow('Provide')
    expect(() => validateVoiceCredentialUpdate({ openrouter: 'not-allowed' })).toThrow('unsupported')
    expect(() => validateVoiceCredentialUpdate({ openai: 'too-short' })).toThrow('format')
    expect(() => validateVoiceCredentialUpdate({ gemini: 'invalid key with whitespace 123456' })).toThrow('format')
    expect(() => validateVoiceCredentialUpdate({ openai: 'invalid#dotenv-value-1234567890' })).toThrow('format')
  })

  it('persists, reports, and removes voice credentials without returning them', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'voice-broker-test-'))
    tempDirectories.push(directory)
    const envFilePath = join(directory, '.env.local')
    await writeFile(envFilePath, 'UNRELATED_SETTING=preserved\n', 'utf8')
    const env: { OPENAI_API_KEY?: string; GEMINI_API_KEY?: string } = {}
    const broker = createVoiceBroker(env, { envFilePath })
    await new Promise<void>((resolve) => broker.listen(0, '127.0.0.1', resolve))

    try {
      const address = broker.address()
      if (!address || typeof address === 'string') throw new Error('Broker did not bind to a test port.')
      const baseUrl = `http://127.0.0.1:${address.port}`
      const openai = 'openai_test_credential_1234567890'
      const gemini = 'gemini_test_credential_1234567890'
      const saveResponse = await fetch(`${baseUrl}/api/voice/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:4317' },
        body: JSON.stringify({ openai, gemini }),
      })
      const saveBody = await saveResponse.json()
      expect(saveResponse.status).toBe(200)
      expect(saveBody).toEqual({ openai: true, gemini: true })
      expect(JSON.stringify(saveBody)).not.toContain(openai)
      expect(JSON.stringify(saveBody)).not.toContain(gemini)
      expect(env).toEqual({ OPENAI_API_KEY: openai, GEMINI_API_KEY: gemini })

      const savedFile = await readFile(envFilePath, 'utf8')
      expect(savedFile).toContain('UNRELATED_SETTING=preserved')
      expect(savedFile).toContain(`OPENAI_API_KEY=${openai}`)
      expect(savedFile).toContain(`GEMINI_API_KEY=${gemini}`)
      expect((await stat(envFilePath)).mode & 0o777).toBe(0o600)

      const removeResponse = await fetch(`${baseUrl}/api/voice/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:4317' },
        body: JSON.stringify({ openai: null }),
      })
      expect(await removeResponse.json()).toEqual({ openai: false, gemini: true })
      expect(env.OPENAI_API_KEY).toBeUndefined()
      expect(await readFile(envFilePath, 'utf8')).not.toContain('OPENAI_API_KEY=')

      const rejectedResponse = await fetch(`${baseUrl}/api/voice/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' },
        body: JSON.stringify({ openai }),
      })
      expect(rejectedResponse.status).toBe(403)
      expect(env.OPENAI_API_KEY).toBeUndefined()
    } finally {
      await new Promise<void>((resolve, reject) => broker.close((error) => error ? reject(error) : resolve()))
    }
  })
})
