import { describe, expect, it } from 'vitest'
import { migrateSettingsState } from './store'

describe('persisted settings migration', () => {
  it('migrates deprecated GPT Realtime to 2.1', () => {
    const migrated = migrateSettingsState({
      models: {
        interviewer: { provider: 'openai', model: 'gpt-realtime' },
      },
    }, 6)
    expect(migrated.models?.interviewer).toEqual({ provider: 'openai', model: 'gpt-realtime-2.1' })
  })

  it('migrates retired Gemini and OpenRouter choices without losing the browser key', () => {
    const interviewer = { provider: 'gemini' as const, model: 'gemini-2.5-flash-native-audio-preview-12-2025' }
    const migrated = migrateSettingsState({ keys: {openrouter: 'test-key'}, models: { interviewer, analyst: {provider: 'openrouter', model: '~openai/gpt-latest'} }, candidateTtsModel: 'gemini-3.1-flash-tts-preview' }, 8)
    expect(migrated.models?.interviewer.model).toBe('gemini-3.8-live')
    expect(migrated.models?.analyst.model).toBe('openai/gpt-6.1-sol')
    expect(migrated.candidateTtsModel).toBe('gemini-3.8-flash-lite-tts')
    expect(migrated.keys?.openrouter).toBe('test-key')
  })
})
