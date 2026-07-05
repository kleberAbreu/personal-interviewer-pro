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

const TEXT_ROLES: Array<Exclude<AgentRole, 'interviewer'>> = ['researcher', 'planner', 'analyst']

function normalizeModel(role: AgentRole, ref: ModelRef | undefined): ModelRef {
  if (role === 'interviewer') {
    return ref?.provider === 'gemini' ? ref : DEFAULT_MODELS.interviewer
  }
  return ref?.provider === 'openrouter' ? ref : DEFAULT_MODELS[role]
}

function normalizeModels(models: Partial<Record<AgentRole, ModelRef>> | undefined): Record<AgentRole, ModelRef> {
  return {
    researcher: normalizeModel('researcher', models?.researcher),
    planner: normalizeModel('planner', models?.planner),
    interviewer: normalizeModel('interviewer', models?.interviewer),
    analyst: normalizeModel('analyst', models?.analyst),
  }
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      keys: { gemini: '', openrouter: '' },
      models: { ...DEFAULT_MODELS },
      interviewerTemplate: DEFAULT_INTERVIEWER_TEMPLATE,
      extraInstructions: '',
      usdToBrl: 5.8,
      setKey: (provider, value) => set((s) => ({ keys: { ...s.keys, [provider]: value } })),
      setModel: (role, ref) => set((s) => ({ models: { ...s.models, [role]: normalizeModel(role, ref) } })),
      setInterviewerTemplate: (t) => set({ interviewerTemplate: t }),
      setExtraInstructions: (t) => set({ extraInstructions: t }),
      setUsdToBrl: (v) => set({ usdToBrl: v }),
      resetInterviewerTemplate: () => set({ interviewerTemplate: DEFAULT_INTERVIEWER_TEMPLATE }),
    }),
    {
      name: 'pip-settings-v1',
      version: 5,
      migrate: (persisted, version) => {
        const state = persisted as Partial<SettingsState> & {
          keys?: Partial<ApiKeys> & { openai?: string; anthropic?: string }
        }
        let models = normalizeModels(state.models)

        if (version < 5) {
          models = { ...models, interviewer: DEFAULT_MODELS.interviewer }
          for (const role of TEXT_ROLES) models[role] = DEFAULT_MODELS[role]
        }

        return {
          ...state,
          keys: {
            gemini: state.keys?.gemini ?? '',
            openrouter: state.keys?.openrouter ?? '',
          },
          models,
        }
      },
    },
  ),
)
