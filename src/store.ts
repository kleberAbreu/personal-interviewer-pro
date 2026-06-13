import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_MODELS } from './config/models'
import { DEFAULT_INTERVIEWER_TEMPLATE } from './config/prompts'
import type { AgentRole, ApiKeys, ModelRef } from './types'

export interface SettingsState {
  keys: ApiKeys
  models: Record<AgentRole, ModelRef>
  interviewerTemplate: string
  extraInstructions: string
  usdToBrl: number
  setKey: (provider: keyof ApiKeys, value: string) => void
  setModel: (role: AgentRole, ref: ModelRef) => void
  setInterviewerTemplate: (t: string) => void
  setExtraInstructions: (t: string) => void
  setUsdToBrl: (v: number) => void
  resetInterviewerTemplate: () => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      keys: { gemini: '', openai: '', anthropic: '', openrouter: '' },
      models: { ...DEFAULT_MODELS },
      interviewerTemplate: DEFAULT_INTERVIEWER_TEMPLATE,
      extraInstructions: '',
      usdToBrl: 5.8,
      setKey: (provider, value) => set((s) => ({ keys: { ...s.keys, [provider]: value } })),
      setModel: (role, ref) => set((s) => ({ models: { ...s.models, [role]: ref } })),
      setInterviewerTemplate: (t) => set({ interviewerTemplate: t }),
      setExtraInstructions: (t) => set({ extraInstructions: t }),
      setUsdToBrl: (v) => set({ usdToBrl: v }),
      resetInterviewerTemplate: () => set({ interviewerTemplate: DEFAULT_INTERVIEWER_TEMPLATE }),
    }),
    {
      name: 'pip-settings-v1',
      version: 4,
      migrate: (persisted, version) => {
        const state = persisted as Partial<SettingsState>
        let models = state.models ? { ...state.models } : { ...DEFAULT_MODELS }
        // v2: padrão passou a priorizar qualidade máxima por função (Opus 4.8 / Fable 5).
        if (version < 2) models = { ...DEFAULT_MODELS }
        // v4: modelos Live antigos (2.0-flash-live-001, live-2.5-preview, native-audio-09-2025)
        // foram desligados pelo Google. Texto gemini-3-pro-preview idem (09/03/2026).
        // Troca pelos IDs atuais preservando as demais escolhas do usuário.
        if (version < 4) {
          const deadVoice = ['gemini-2.0-flash-live-001', 'gemini-live-2.5-flash-preview', 'gemini-2.5-flash-native-audio-preview-09-2025', 'gemini-2.0-flash-exp']
          if (!models.interviewer || deadVoice.includes(models.interviewer.model)) {
            models = { ...models, interviewer: DEFAULT_MODELS.interviewer }
          }
          for (const role of ['researcher', 'planner', 'analyst'] as const) {
            if (models[role]?.model === 'gemini-3-pro-preview') {
              models = { ...models, [role]: { provider: 'gemini', model: 'gemini-3.1-pro-preview' } }
            }
          }
        }
        return { ...state, models }
      },
    },
  ),
)
