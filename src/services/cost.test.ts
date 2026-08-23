import { describe, expect, it } from 'vitest'
import { addVoiceUsage, emptyVoiceUsage, voiceCostUsd } from './cost'

describe('voice costs', () => {
  it('uses structured text and audio token usage', () => {
    const usage = addVoiceUsage(emptyVoiceUsage(), {
      inputAudioTokens: 1_000_000,
      outputAudioTokens: 1_000_000,
      inputTextTokens: 1_000_000,
      outputTextTokens: 1_000_000,
      cachedInputTokens: 0,
      estimated: false,
    })
    expect(voiceCostUsd({ provider: 'openai', model: 'gpt-realtime-2.1-mini' }, usage)).toBeCloseTo(33)
  })

  it('preserves the estimated marker when usage is accumulated', () => {
    const usage = addVoiceUsage(emptyVoiceUsage(), {
      inputAudioTokens: 25,
      outputAudioTokens: 50,
      inputTextTokens: 0,
      outputTextTokens: 0,
      cachedInputTokens: 0,
      estimated: true,
    })
    expect(usage.estimated).toBe(true)
  })
})
