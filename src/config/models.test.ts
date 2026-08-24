import { describe, expect, it } from 'vitest'
import {
  CATALOG, DEFAULT_MODELS, ROLE_SUGGESTIONS, compatibleVoice, modelInfo, supportsAffectiveDialog,
  supportsVoiceReasoning, voicesForModel,
} from './models'

describe('voice model catalog', () => {
  it('uses Gemini 3.1 Live as the default and excludes deprecated GPT Realtime', () => {
    expect(DEFAULT_MODELS.interviewer.model).toBe('gemini-3.1-flash-live-preview')
    expect(CATALOG.some((model) => model.id === 'gpt-realtime')).toBe(false)
    expect(CATALOG.filter((model) => model.voice)).toHaveLength(5)
  })

  it('exposes all Gemini voices and model-specific defaults', () => {
    const ref = DEFAULT_MODELS.interviewer
    expect(voicesForModel(ref)).toHaveLength(30)
    expect(compatibleVoice(ref, 'not-a-voice')).toBe('Kore')
    expect(compatibleVoice({ provider: 'openai', model: 'gpt-realtime-2.1' }, 'Kore')).toBe('marin')
  })

  it('gates reasoning and affective dialog by model capability', () => {
    expect(supportsVoiceReasoning(DEFAULT_MODELS.interviewer)).toBe(true)
    expect(supportsAffectiveDialog(DEFAULT_MODELS.interviewer)).toBe(false)
    const expressive = { provider: 'gemini' as const, model: 'gemini-2.5-flash-native-audio-preview-12-2025' }
    expect(supportsVoiceReasoning(expressive)).toBe(false)
    expect(supportsAffectiveDialog(expressive)).toBe(true)
    expect(modelInfo(expressive)?.preset).toBe('expressive')
  })

  it('includes the latest OpenAI and Anthropic text families through OpenRouter', () => {
    const expected = [
      ['~openai/gpt-latest', 2, 10, 1_050_000],
      ['openai/gpt-5.6-sol', 2, 10, 1_050_000],
      ['openai/gpt-5.6-terra', 2, 12, 1_050_000],
      ['openai/gpt-5.6-luna', 0.2, 1.2, 1_050_000],
      ['~anthropic/claude-opus-latest', 5, 25, 1_000_000],
      ['anthropic/claude-opus-5', 5, 25, 1_000_000],
      ['anthropic/claude-opus-5-fast', 10, 50, 1_000_000],
      ['anthropic/claude-sonnet-5', 2, 10, 1_000_000],
    ] as const

    for (const [id, inputPerM, outputPerM, contextWindow] of expected) {
      expect(modelInfo({ provider: 'openrouter', model: id })).toMatchObject({
        inputPerM,
        outputPerM,
        contextWindow,
      })
    }
    expect(ROLE_SUGGESTIONS.analyst.alternatives).toContainEqual({
      provider: 'openrouter',
      model: '~anthropic/claude-opus-latest',
    })
    expect(ROLE_SUGGESTIONS.candidate.alternatives).toContainEqual({
      provider: 'openrouter',
      model: 'anthropic/claude-opus-5-fast',
    })
  })
})
