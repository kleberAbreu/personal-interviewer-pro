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
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as Partial<SettingsState>
        let models = state.models ? { ...state.models } : { ...DEFAULT_MODELS }
        // v2: padrão passou a priorizar qualidade máxima por função (Opus 4.8 / Fable 5).
        if (version < 2) models = { ...DEFAULT_MODELS }
        // v3: troca o modelo de voz native-audio (que fechava a conexão) pelo Live GA estável,
        // preservando as demais escolhas do usuário.
        if (version < 3 && (!models.interviewer || models.interviewer.model.includes('native-audio') || models.interviewer.model === 'gemini-2.0-flash-exp')) {
          models = { ...models, interviewer: DEFAULT_MODELS.interviewer }
        }
        return { ...state, models }
      },
    },
  ),
)
