import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_CANDIDATE_ENGINE,
  DEFAULT_CANDIDATE_TTS_MODEL,
  DEFAULT_CANDIDATE_VOICE,
  DEFAULT_MODELS,
} from './config/models'
import { DEFAULT_INTERVIEWER_TEMPLATE } from './config/prompts'
import type { AgentRole, ApiKeys, CandidateEngine, ModelRef } from './types'

export interface SettingsState {
  keys: ApiKeys
  models: Record<AgentRole, ModelRef>
  interviewerTemplate: string
  extraInstructions: string
  usdToBrl: number
  /** Engine da IA candidata no modo espectador. */
  candidateEngine: CandidateEngine
  /** Voz TTS da candidata (engine texto+TTS). */
  candidateVoice: string
  /** Modelo Gemini TTS que fala as respostas da candidata. */
  candidateTtsModel: string
  setKey: (provider: keyof ApiKeys, value: string) => void
  setModel: (role: AgentRole, ref: ModelRef) => void
  setInterviewerTemplate: (t: string) => void
  setExtraInstructions: (t: string) => void
  setUsdToBrl: (v: number) => void
  setCandidateEngine: (e: CandidateEngine) => void
  setCandidateVoice: (v: string) => void
  setCandidateTtsModel: (m: string) => void
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
    candidate: normalizeModel('candidate', models?.candidate),
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
      candidateEngine: DEFAULT_CANDIDATE_ENGINE,
      candidateVoice: DEFAULT_CANDIDATE_VOICE,
      candidateTtsModel: DEFAULT_CANDIDATE_TTS_MODEL,
      setKey: (provider, value) => set((s) => ({ keys: { ...s.keys, [provider]: value } })),
      setModel: (role, ref) => set((s) => ({ models: { ...s.models, [role]: normalizeModel(role, ref) } })),
      setInterviewerTemplate: (t) => set({ interviewerTemplate: t }),
      setExtraInstructions: (t) => set({ extraInstructions: t }),
      setUsdToBrl: (v) => set({ usdToBrl: v }),
      setCandidateEngine: (e) => set({ candidateEngine: e }),
      setCandidateVoice: (v) => set({ candidateVoice: v }),
      setCandidateTtsModel: (m) => set({ candidateTtsModel: m }),
      resetInterviewerTemplate: () => set({ interviewerTemplate: DEFAULT_INTERVIEWER_TEMPLATE }),
    }),
    {
      name: 'pip-settings-v1',
      version: 6,
      migrate: (persisted, version) => {
        const state = persisted as Partial<SettingsState> & {
          keys?: Partial<ApiKeys> & { openai?: string; anthropic?: string }
        }
        let models = normalizeModels(state.models)

        if (version < 5) {
          models = { ...models, interviewer: DEFAULT_MODELS.interviewer }
          for (const role of TEXT_ROLES) models[role] = DEFAULT_MODELS[role]
        }

        // v6: modo espectador (IA candidata) — novos campos com defaults.
        if (version < 6) {
          models = { ...models, candidate: DEFAULT_MODELS.candidate }
        }

        return {
          ...state,
          keys: {
            gemini: state.keys?.gemini ?? '',
            openrouter: state.keys?.openrouter ?? '',
          },
          models,
          candidateEngine: state.candidateEngine ?? DEFAULT_CANDIDATE_ENGINE,
          candidateVoice: state.candidateVoice ?? DEFAULT_CANDIDATE_VOICE,
          candidateTtsModel: state.candidateTtsModel ?? DEFAULT_CANDIDATE_TTS_MODEL,
        }
      },
    },
  ),
)
