import { describe, expect, it } from 'vitest'
import { validateGeminiRequest, validateGeminiTtsRequest, validateOpenAiRequest } from './voiceBroker'

describe('voice broker validation', () => {
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
})
