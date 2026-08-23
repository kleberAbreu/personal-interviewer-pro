import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_CANDIDATE_ENGINE,
  DEFAULT_CANDIDATE_TTS_MODEL,
  DEFAULT_CANDIDATE_VOICE,
  DEFAULT_MODELS,
} from './config/models'
import { DEFAULT_INTERVIEWER_TEMPLATE, DEFAULT_INTERVIEWER_TEMPLATES, isDefaultInterviewerTemplate } from './config/prompts'
import type { AgentRole, ApiKeys, CandidateEngine, ModelRef, UiLanguage } from './types'

export interface SettingsState {
  keys: ApiKeys
  models: Record<AgentRole, ModelRef>
  interviewerTemplate: string
  extraInstructions: string
  usdToBrl: number
  uiLanguage: UiLanguage
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
  setUiLanguage: (v: UiLanguage) => void
  setCandidateEngine: (e: CandidateEngine) => void
  setCandidateVoice: (v: string) => void
  setCandidateTtsModel: (m: string) => void
  resetInterviewerTemplate: () => void
}

const TEXT_ROLES: Array<Exclude<AgentRole, 'interviewer'>> = ['researcher', 'planner', 'analyst']

function normalizeModel(role: AgentRole, ref: ModelRef | undefined): ModelRef {
  if (role === 'interviewer') {
    return ref?.provider === 'gemini' || ref?.provider === 'openai' ? ref : DEFAULT_MODELS.interviewer
  }
  return ref?.provider === 'openrouter' ? ref : DEFAULT_MODELS[role]
}

export function migrateSettingsState(persisted: unknown, version: number): Partial<SettingsState> {
  const state = persisted as Partial<SettingsState> & {
    keys?: Partial<ApiKeys> & { gemini?: string; openai?: string; anthropic?: string }
  }
  let models = normalizeModels(state.models)
  const uiLanguage = state.uiLanguage ?? 'en-US'

  if (version < 5) {
    models = { ...models, interviewer: DEFAULT_MODELS.interviewer }
    for (const role of TEXT_ROLES) models[role] = DEFAULT_MODELS[role]
  }

  if (version < 6) {
    models = { ...models, candidate: DEFAULT_MODELS.candidate }
  }

  if (version < 8 && models.interviewer.model === 'gpt-realtime') {
    models = { ...models, interviewer: { provider: 'openai', model: 'gpt-realtime-2.1' } }
  }

  const interviewerTemplate = isDefaultInterviewerTemplate(state.interviewerTemplate)
    ? DEFAULT_INTERVIEWER_TEMPLATES[uiLanguage]
    : state.interviewerTemplate ?? DEFAULT_INTERVIEWER_TEMPLATES[uiLanguage]

  return {
    ...state,
    keys: {
      openrouter: state.keys?.openrouter ?? '',
    },
    models,
    uiLanguage,
    interviewerTemplate,
    candidateEngine: state.candidateEngine ?? DEFAULT_CANDIDATE_ENGINE,
    candidateVoice: state.candidateVoice ?? DEFAULT_CANDIDATE_VOICE,
    candidateTtsModel: state.candidateTtsModel ?? DEFAULT_CANDIDATE_TTS_MODEL,
  }
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
      keys: { openrouter: '' },
      models: { ...DEFAULT_MODELS },
      interviewerTemplate: DEFAULT_INTERVIEWER_TEMPLATE,
      extraInstructions: '',
      usdToBrl: 5.8,
      uiLanguage: 'en-US',
      candidateEngine: DEFAULT_CANDIDATE_ENGINE,
      candidateVoice: DEFAULT_CANDIDATE_VOICE,
      candidateTtsModel: DEFAULT_CANDIDATE_TTS_MODEL,
      setKey: (provider, value) => set((s) => ({ keys: { ...s.keys, [provider]: value } })),
      setModel: (role, ref) => set((s) => ({ models: { ...s.models, [role]: normalizeModel(role, ref) } })),
      setInterviewerTemplate: (t) => set({ interviewerTemplate: t }),
      setExtraInstructions: (t) => set({ extraInstructions: t }),
      setUsdToBrl: (v) => set({ usdToBrl: v }),
      setUiLanguage: (v) => set((s) => ({
        uiLanguage: v,
        interviewerTemplate: isDefaultInterviewerTemplate(s.interviewerTemplate)
          ? DEFAULT_INTERVIEWER_TEMPLATES[v]
          : s.interviewerTemplate,
      })),
      setCandidateEngine: (e) => set({ candidateEngine: e }),
      setCandidateVoice: (v) => set({ candidateVoice: v }),
      setCandidateTtsModel: (m) => set({ candidateTtsModel: m }),
      resetInterviewerTemplate: () => set((s) => ({ interviewerTemplate: DEFAULT_INTERVIEWER_TEMPLATES[s.uiLanguage] })),
    }),
    {
      name: 'pip-settings-v1',
      version: 8,
      migrate: migrateSettingsState,
    },
  ),
)
