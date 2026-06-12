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
    { name: 'pip-settings-v1' },
  ),
)
