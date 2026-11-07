import type { AgentRole, CandidateEngine, ModelRef, Provider, VoiceReasoningMode } from '../types'

// Precos em USD por 1M de tokens. Modelos de texto sao roteados via OpenRouter;
// modelos Gemini abaixo sao apenas para entrevista de voz realtime.
export interface ModelInfo {
  provider: Provider
  id: string
  label: string
  inputPerM: number
  outputPerM: number
  audioInputPerM?: number
  audioOutputPerM?: number
  voice?: boolean
  maturity?: 'ga' | 'preview'
  contextWindow?: number
  transport?: 'webrtc' | 'websocket'
  voices?: readonly string[]
  defaultVoice?: string
  preset?: 'default' | 'expressive' | 'premium' | 'economy' | 'voice-quality'
  reasoning?: boolean
  affectiveDialog?: boolean
  note?: string
}

export const GEMINI_VOICES = [
  'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede',
  'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba',
  'Despina', 'Erinome', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar',
  'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
  'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat',
] as const

export const OPENAI_VOICES = [
  'cedar', 'marin', 'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse',
] as const

export const CATALOG: ModelInfo[] = [
  {
    provider: 'gemini',
    id: 'gemini-3.8-live',
    label: 'Gemini 3.8 Live',
    inputPerM: 0.75,
    outputPerM: 4.5,
    audioInputPerM: 3.0,
    audioOutputPerM: 12.0,
    voice: true,
    maturity: 'ga',
    contextWindow: 128_000,
    transport: 'websocket',
    voices: GEMINI_VOICES,
    defaultVoice: 'Kore',
    preset: 'default',
    reasoning: false,
    affectiveDialog: false,
    note: 'Voz de baixa latencia com raciocinio integrado, sem nivel configuravel.',
  },
  {
    provider: 'openai',
    id: 'gpt-realtime-2.1',
    label: 'GPT Realtime 2.1',
    inputPerM: 4.0,
    outputPerM: 24.0,
    audioInputPerM: 32.0,
    audioOutputPerM: 64.0,
    voice: true,
    maturity: 'ga',
    contextWindow: 128_000,
    transport: 'webrtc',
    voices: OPENAI_VOICES,
    defaultVoice: 'marin',
    preset: 'premium',
    reasoning: true,
    affectiveDialog: false,
    note: 'Modo Premium: raciocinio, tool use e melhor tratamento de ruido, silencio e interrupcoes.',
  },
  {
    provider: 'openai',
    id: 'gpt-realtime-2.1-mini',
    label: 'GPT Realtime 2.1 mini',
    inputPerM: 0.6,
    outputPerM: 2.4,
    audioInputPerM: 10.0,
    audioOutputPerM: 20.0,
    voice: true,
    maturity: 'ga',
    contextWindow: 128_000,
    transport: 'webrtc',
    voices: OPENAI_VOICES,
    defaultVoice: 'marin',
    preset: 'economy',
    reasoning: true,
    affectiveDialog: false,
    note: 'Modo Economy: mesma janela de 128k e raciocinio da familia 2.1 com custo menor.',
  },
  {
    provider: 'openai',
    id: 'gpt-realtime-1.5',
    label: 'GPT Realtime 1.5',
    inputPerM: 4.0,
    outputPerM: 16.0,
    audioInputPerM: 32.0,
    audioOutputPerM: 64.0,
    voice: true,
    maturity: 'ga',
    contextWindow: 32_000,
    transport: 'webrtc',
    voices: OPENAI_VOICES,
    defaultVoice: 'marin',
    preset: 'voice-quality',
    reasoning: false,
    affectiveDialog: false,
    note: 'Modo Voice quality: foco em naturalidade de voz, sem raciocinio configuravel.',
  },
  {
    provider: 'openrouter',
    id: '~google/gemini-flash-latest',
    label: 'Gemini Flash Latest (via OpenRouter)',
    inputPerM: 0.75,
    outputPerM: 3.75,
    note: 'Default do Pesquisador. Contexto longo e bom custo para briefing.',
  },
  {
    provider: 'openrouter',
    id: 'google/gemini-3.5-flash',
    label: 'Gemini 3.5 Flash (via OpenRouter)',
    inputPerM: 1.5,
    outputPerM: 9,
    note: 'Fallback estavel para pesquisa e tarefas leves.',
  },
  {
    provider: 'openrouter',
    id: '~anthropic/claude-sonnet-latest',
    label: 'Claude Sonnet Latest (via OpenRouter)',
    inputPerM: 2,
    outputPerM: 10,
    note: 'Default do Planejador. Bom equilibrio entre criterio, velocidade e custo.',
  },
  {
    provider: 'openrouter',
    id: 'anthropic/claude-sonnet-5',
    label: 'Claude Sonnet 5 (via OpenRouter)',
    inputPerM: 2,
    outputPerM: 10,
    contextWindow: 1_000_000,
    note: 'Versao fixa do Sonnet 5 para planejamento, avaliacao e respostas com baixa latencia.',
  },
  {
    provider: 'openrouter',
    id: 'anthropic/claude-sonnet-4.6',
    label: 'Claude Sonnet 4.6 (via OpenRouter)',
    inputPerM: 3,
    outputPerM: 15,
    note: 'Fallback estavel para planejamento e avaliacao.',
  },
  {
    provider: 'openrouter',
    id: '~anthropic/claude-fable-latest',
    label: 'Claude Fable Latest (via OpenRouter)',
    inputPerM: 10,
    outputPerM: 50,
    note: 'Default do Analista. Melhor para avaliacao critica baseada em evidencias.',
  },
  {
    provider: 'openrouter',
    id: 'anthropic/claude-fable-5',
    label: 'Claude Fable 5 (via OpenRouter)',
    inputPerM: 10,
    outputPerM: 50,
    note: 'Fallback estavel para relatorios de alta qualidade.',
  },
  {
    provider: 'openrouter',
    id: '~anthropic/claude-opus-latest',
    label: 'Claude Opus Latest (via OpenRouter)',
    inputPerM: 4,
    outputPerM: 20,
    contextWindow: 1_000_000,
    note: 'Sempre aponta para o Opus mais novo. Ideal para analise critica e tarefas complexas.',
  },
  {
    provider: 'openrouter',
    id: 'anthropic/claude-opus-5',
    label: 'Claude Opus 5 (via OpenRouter)',
    inputPerM: 5,
    outputPerM: 25,
    contextWindow: 1_000_000,
    note: 'Novo Opus 5 para raciocinio exigente, coding e trabalho agentico de longa duracao.',
  },
  {
    provider: 'openrouter',
    id: 'anthropic/claude-opus-4.8',
    label: 'Claude Opus 4.8 (via OpenRouter)',
    inputPerM: 5,
    outputPerM: 25,
    note: 'Topo da familia Opus (1M de contexto). Otimo como IA Candidata de altissima qualidade.',
  },
  {
    provider: 'openrouter',
    id: 'openai/gpt-6.1-sol',
    label: 'GPT-6.1 Sol (via OpenRouter)',
    inputPerM: 2,
    outputPerM: 10,
    contextWindow: 1_050_000,
    note: 'Modelo fixo GPT-6.1 Sol para raciocinio e analise.',
  },
  {
    provider: 'openrouter',
    id: 'openai/gpt-5.6-sol',
    label: 'GPT-5.6 Sol (via OpenRouter)',
    inputPerM: 4,
    outputPerM: 20,
    contextWindow: 1_050_000,
    note: 'Flagship GPT-5.6 para analise complexa, raciocinio e trabalho agentico.',
  },
  {
    provider: 'openrouter',
    id: 'openai/gpt-5.6-terra',
    label: 'GPT-5.6 Terra (via OpenRouter)',
    inputPerM: 2,
    outputPerM: 12,
    contextWindow: 1_050_000,
    note: 'GPT-5.6 equilibrado para qualidade, latencia e custo.',
  },
  {
    provider: 'openrouter',
    id: 'openai/gpt-5.6-luna',
    label: 'GPT-5.6 Luna (via OpenRouter)',
    inputPerM: 0.2,
    outputPerM: 1.2,
    contextWindow: 1_050_000,
    note: 'GPT-5.6 economico para tarefas de alto volume e menor risco.',
  },
  {
    provider: 'openrouter',
    id: 'openai/gpt-5.5',
    label: 'GPT-5.5 (via OpenRouter)',
    inputPerM: 5,
    outputPerM: 30,
    note: 'Opcao forte de texto via OpenRouter, sem chave OpenAI direta.',
  },
  {
    provider: 'openrouter',
    id: 'deepseek/deepseek-v4-pro',
    label: 'DeepSeek V4 Pro (via OpenRouter)',
    inputPerM: 0.616656,
    outputPerM: 1.233312,
    note: 'Opcao economica para textos longos.',
  },
  {
    provider: 'openrouter',
    id: 'deepseek/deepseek-v4-flash',
    label: 'DeepSeek V4 Flash (via OpenRouter)',
    inputPerM: 0.091,
    outputPerM: 0.182,
    note: 'Opcao mais barata para iteracoes de baixo risco.',
  },
  {
    provider: 'openrouter',
    id: 'openrouter/auto',
    label: 'OpenRouter Auto',
    inputPerM: -1000000,
    outputPerM: -1000000,
    note: 'Roteamento automatico. O custo real depende do modelo escolhido pelo OpenRouter.',
  },
]

export function modelInfo(ref: ModelRef): ModelInfo | undefined {
  return CATALOG.find((m) => m.provider === ref.provider && m.id === ref.model)
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
}

export interface RoleSuggestion {
  title: string
  description: string
  recommended: ModelRef
  alternatives: ModelRef[]
  rationale: string
}

const or = (model: string): ModelRef => ({ provider: 'openrouter', model })
const gemini = (model: string): ModelRef => ({ provider: 'gemini', model })

export const ROLE_SUGGESTIONS: Record<AgentRole, RoleSuggestion> = {
  researcher: {
    title: 'Pesquisador (Company Brief)',
    description: 'Analisa a vaga e o CV e monta o perfil da empresa, cultura e estilo de entrevista.',
    recommended: or('~google/gemini-flash-latest'),
    alternatives: [or('google/gemini-3.5-flash'), or('openai/gpt-5.6-luna'), or('deepseek/deepseek-v4-flash')],
    rationale:
      'Gemini Flash via OpenRouter combina contexto longo e bom custo para montar o brief sem gastar o modelo mais caro.',
  },
  planner: {
    title: 'Planejador (Roteiro da entrevista)',
    description: 'Cria o roteiro adaptativo em blocos cronometrados, com rubrica e guardrails.',
    recommended: or('~anthropic/claude-sonnet-latest'),
    alternatives: [or('anthropic/claude-sonnet-5'), or('openai/gpt-5.6-terra'), or('deepseek/deepseek-v4-pro')],
    rationale:
      'Sonnet via OpenRouter entrega boa calibragem por senioridade e follow-ups sem exigir chave Anthropic direta.',
  },
  interviewer: {
    title: 'Entrevistador (voz ao vivo)',
    description: 'Conduz a entrevista por voz realtime via Gemini Live ou OpenAI WebRTC.',
    recommended: gemini('gemini-3.8-live'),
    alternatives: [
      { provider: 'openai', model: 'gpt-realtime-2.1' },
      { provider: 'openai', model: 'gpt-realtime-2.1-mini' },
      { provider: 'openai', model: 'gpt-realtime-1.5' },
    ],
    rationale:
      'Gemini 3.8 Live prioriza baixa latencia. OpenAI 2.1 e premium, 2.1 mini economico e 1.5 prioriza naturalidade.',
  },
  analyst: {
    title: 'Analista (Relatorio de performance)',
    description: 'Audita a transcricao e gera o relatorio com notas, evidencias e plano de treino.',
    recommended: or('~anthropic/claude-fable-latest'),
    alternatives: [or('anthropic/claude-fable-5'), or('~anthropic/claude-opus-latest'), or('openai/gpt-6.1-sol')],
    rationale:
      'Fable via OpenRouter prioriza avaliacao critica sem exigir chave Anthropic direta.',
  },
  candidate: {
    title: 'IA Candidata (modo espectador)',
    description: 'Assume o seu CV como identidade e responde ao entrevistador com maestria, em tempo real.',
    recommended: or('~anthropic/claude-sonnet-latest'),
    alternatives: [or('anthropic/claude-opus-5'), or('~anthropic/claude-opus-latest'), or('openai/gpt-5.6-terra')],
    rationale:
      'Sonnet (alias latest -> Sonnet 5) equilibra qualidade e latencia para conversa em tempo real. Opus 5 prioriza velocidade; Opus Latest e GPT-5.6 Terra elevam a qualidade com custo maior.',
  },
}

export const DEFAULT_MODELS: Record<AgentRole, ModelRef> = {
  researcher: ROLE_SUGGESTIONS.researcher.recommended,
  planner: ROLE_SUGGESTIONS.planner.recommended,
  interviewer: ROLE_SUGGESTIONS.interviewer.recommended,
  analyst: ROLE_SUGGESTIONS.analyst.recommended,
  candidate: ROLE_SUGGESTIONS.candidate.recommended,
}

export function voicesForProvider(provider: Provider): string[] {
  return provider === 'openai' ? [...OPENAI_VOICES] : [...GEMINI_VOICES]
}

export function voicesForModel(ref: ModelRef): readonly string[] {
  return modelInfo(ref)?.voices ?? []
}

export function defaultVoiceForModel(ref: ModelRef): string {
  return modelInfo(ref)?.defaultVoice ?? (ref.provider === 'openai' ? 'marin' : 'Kore')
}

export function compatibleVoice(ref: ModelRef, voice: string | undefined): string {
  const voices = voicesForModel(ref)
  return voice && voices.includes(voice) ? voice : defaultVoiceForModel(ref)
}

export function supportsVoiceReasoning(ref: ModelRef): boolean {
  return modelInfo(ref)?.reasoning === true
}

export function supportsAffectiveDialog(ref: ModelRef): boolean {
  return modelInfo(ref)?.affectiveDialog === true
}

export const VOICE_REASONING_EFFORT: Record<VoiceReasoningMode, 'minimal' | 'low' | 'medium'> = {
  fast: 'minimal',
  balanced: 'low',
  deep: 'medium',
}

export const AUDIO_TOKENS_PER_SECOND = 32

// ── IA Candidata (modo espectador) ──────────────────────────────────────────

export const CANDIDATE_ENGINE_LABELS: Record<CandidateEngine, string> = {
  'text-tts': 'LLM texto + voz TTS (recomendado)',
  'gemini-live': 'Segunda sessão Gemini Live (experimental)',
}

export const DEFAULT_CANDIDATE_ENGINE: CandidateEngine = 'text-tts'

/** Voz padrão da candidata — diferente do default do entrevistador (Kore) para distinguir na escuta. */
export const DEFAULT_CANDIDATE_VOICE = 'Puck'

/** Modelos Gemini TTS para a voz da candidata (engine texto+TTS). Verificado em ai.google.dev, 07/2026. */
export const CANDIDATE_TTS_MODELS = [
  { id: 'gemini-3.8-flash-lite-tts', label: 'Gemini 3.8 Flash-Lite TTS' },
  { id: 'gemini-3.8-flash-tts', label: 'Gemini 3.8 Flash TTS (qualidade)' },
] as const

export const DEFAULT_CANDIDATE_TTS_MODEL = 'gemini-3.8-flash-lite-tts'
