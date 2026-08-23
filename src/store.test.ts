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

  it('preserves an existing Gemini 2.5 voice choice', () => {
    const interviewer = { provider: 'gemini' as const, model: 'gemini-2.5-flash-native-audio-preview-12-2025' }
    const migrated = migrateSettingsState({ models: { interviewer } }, 6)
    expect(migrated.models?.interviewer).toEqual(interviewer)
  })
})
