import type { AgentRole, ModelRef, Provider } from '../types'

// Preços em USD por 1M de tokens. Os preços Anthropic são oficiais (jun/2026);
// os demais são estimativas baseadas em tabelas públicas — ajuste aqui se mudarem.
export interface ModelInfo {
  provider: Provider
  id: string
  label: string
  inputPerM: number
  outputPerM: number
  // USD por 1M tokens de áudio (modelos realtime); tokens estimados por duração
  audioInputPerM?: number
  audioOutputPerM?: number
  voice?: boolean // suporta entrevista por voz em tempo real
  note?: string
}

export const CATALOG: ModelInfo[] = [
  // ── Google Gemini ────────────────────────────────────────────────
  {
    provider: 'gemini', id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro',
    inputPerM: 2.0, outputPerM: 12.0,
    note: 'Raciocínio forte, ótimo custo. Bom para pesquisa e planejamento.',
  },
  {
    provider: 'gemini', id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash',
    inputPerM: 0.3, outputPerM: 2.5,
    note: 'Rápido e barato. Suficiente para pesquisa de empresa.',
  },
  {
    provider: 'gemini', id: 'gemini-2.5-flash-native-audio-preview-09-2025', label: 'Gemini 2.5 Flash Native Audio (Live)',
    inputPerM: 0.3, outputPerM: 2.5, audioInputPerM: 3.0, audioOutputPerM: 12.0, voice: true,
    note: 'Voz nativa de alta qualidade via Gemini Live API. Recomendado para a entrevista.',
  },
  {
    provider: 'gemini', id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp (Live)',
    inputPerM: 0.1, outputPerM: 0.4, audioInputPerM: 2.0, audioOutputPerM: 8.0, voice: true,
    note: 'Modelo Live experimental usado no app original. Pode ser descontinuado.',
  },

  // ── OpenAI ───────────────────────────────────────────────────────
  {
    provider: 'openai', id: 'gpt-5.5', label: 'GPT-5.5',
    inputPerM: 1.25, outputPerM: 10.0,
    note: 'Flagship OpenAI. Excelente para análise e relatório.',
  },
  {
    provider: 'openai', id: 'gpt-5.5-mini', label: 'GPT-5.5 Mini',
    inputPerM: 0.25, outputPerM: 2.0,
    note: 'Custo baixo para tarefas mais simples (pesquisa).',
  },
  {
    provider: 'openai', id: 'gpt-realtime', label: 'GPT Realtime (voz)',
    inputPerM: 4.0, outputPerM: 16.0, audioInputPerM: 32.0, audioOutputPerM: 64.0, voice: true,
    note: 'Voz em tempo real via OpenAI Realtime API. Mais caro que o Gemini Live, prosódia excelente em inglês.',
  },

  // ── Anthropic (preços oficiais) ──────────────────────────────────
  {
    provider: 'anthropic', id: 'claude-fable-5', label: 'Claude Fable 5',
    inputPerM: 10.0, outputPerM: 50.0,
    note: 'Modelo mais inteligente da Anthropic. Use quando a qualidade do feedback importa mais que o custo.',
  },
  {
    provider: 'anthropic', id: 'claude-opus-4-8', label: 'Claude Opus 4.8',
    inputPerM: 5.0, outputPerM: 25.0,
    note: 'Melhor análise crítica baseada em evidências. Recomendado para o Analista.',
  },
  {
    provider: 'anthropic', id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6',
    inputPerM: 3.0, outputPerM: 15.0,
    note: 'Equilíbrio velocidade/inteligência. Ótimo para o Planejador.',
  },
  {
    provider: 'anthropic', id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5',
    inputPerM: 1.0, outputPerM: 5.0,
    note: 'Rápido e econômico para tarefas simples.',
  },

  // ── OpenRouter (roteador multi-modelo) ───────────────────────────
  {
    provider: 'openrouter', id: 'openrouter/auto', label: 'OpenRouter Auto',
    inputPerM: 3.0, outputPerM: 15.0,
    note: 'O OpenRouter escolhe automaticamente o melhor modelo disponível para o prompt.',
  },
  {
    provider: 'openrouter', id: 'anthropic/claude-opus-4.8', label: 'Claude Opus 4.8 (via OpenRouter)',
    inputPerM: 5.0, outputPerM: 25.0,
    note: 'Acesso ao Claude com uma única chave OpenRouter.',
  },
  {
    provider: 'openrouter', id: 'openai/gpt-5.5', label: 'GPT-5.5 (via OpenRouter)',
    inputPerM: 1.25, outputPerM: 10.0,
    note: 'Acesso ao GPT com uma única chave OpenRouter.',
  },
  {
    provider: 'openrouter', id: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro (via OpenRouter)',
    inputPerM: 2.0, outputPerM: 12.0,
    note: 'Acesso ao Gemini com uma única chave OpenRouter.',
  },
  {
    provider: 'openrouter', id: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4 Pro (via OpenRouter)',
    inputPerM: 0.5, outputPerM: 2.0,
    note: 'Custo muito baixo com qualidade alta. Bom fallback econômico.',
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

export const ROLE_SUGGESTIONS: Record<AgentRole, RoleSuggestion> = {
  researcher: {
    title: 'Pesquisador (Company Brief)',
    description: 'Analisa a vaga e o CV e monta o perfil da empresa, cultura e estilo de entrevista.',
    recommended: { provider: 'gemini', model: 'gemini-3-pro-preview' },
    alternatives: [
      { provider: 'anthropic', model: 'claude-sonnet-4-6' },
      { provider: 'openai', model: 'gpt-5.5-mini' },
      { provider: 'openrouter', model: 'deepseek/deepseek-v4-pro' },
    ],
    rationale:
      'Tarefa de extração + inferência. Gemini 3 Pro tem ótimo custo-benefício; modelos mini/baratos também funcionam bem aqui — não vale pagar flagship.',
  },
  planner: {
    title: 'Planejador (Roteiro da entrevista)',
    description: 'Cria o roteiro adaptativo em blocos cronometrados, com rubrica e guardrails.',
    recommended: { provider: 'anthropic', model: 'claude-sonnet-4-6' },
    alternatives: [
      { provider: 'gemini', model: 'gemini-3-pro-preview' },
      { provider: 'openai', model: 'gpt-5.5' },
      { provider: 'openrouter', model: 'openrouter/auto' },
    ],
    rationale:
      'Boas perguntas definem a qualidade da simulação. Claude Sonnet 4.6 escreve perguntas comportamentais e técnicas muito bem calibradas por senioridade.',
  },
  interviewer: {
    title: 'Entrevistador (voz em tempo real)',
    description: 'Conduz a entrevista por voz (pt-BR ou inglês), com follow-ups dinâmicos.',
    recommended: { provider: 'gemini', model: 'gemini-2.5-flash-native-audio-preview-09-2025' },
    alternatives: [{ provider: 'openai', model: 'gpt-realtime' }],
    rationale:
      'Apenas Gemini Live e OpenAI Realtime suportam conversa de voz no navegador. Gemini Live tem sotaque pt-BR natural e custa menos; GPT Realtime tem prosódia excelente em inglês — boa escolha para treinar entrevista em inglês.',
  },
  analyst: {
    title: 'Analista (Relatório de performance)',
    description: 'Audita a transcrição e gera o relatório com notas, evidências e plano de treino.',
    recommended: { provider: 'anthropic', model: 'claude-opus-4-8' },
    alternatives: [
      { provider: 'anthropic', model: 'claude-fable-5' },
      { provider: 'openai', model: 'gpt-5.5' },
      { provider: 'gemini', model: 'gemini-3-pro-preview' },
    ],
    rationale:
      'A função mais sensível à inteligência: exige avaliação crítica sem alucinação e citações literais. Claude Opus 4.8 é o melhor avaliador baseado em evidências; Fable 5 se quiser o teto máximo de qualidade.',
  },
}

// Padrão de fábrica: tudo Gemini, para funcionar só com a chave Gemini
// (como o app original). O painel de Modelos sugere upgrades por função.
export const DEFAULT_MODELS: Record<AgentRole, ModelRef> = {
  researcher: { provider: 'gemini', model: 'gemini-3-pro-preview' },
  planner: { provider: 'gemini', model: 'gemini-3-pro-preview' },
  interviewer: { provider: 'gemini', model: 'gemini-2.5-flash-native-audio-preview-09-2025' },
  analyst: { provider: 'gemini', model: 'gemini-3-pro-preview' },
}

export const GEMINI_VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr']
export const OPENAI_VOICES = ['cedar', 'marin', 'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse']

export function voicesForProvider(provider: Provider): string[] {
  return provider === 'openai' ? OPENAI_VOICES : GEMINI_VOICES
}

// Tokens de áudio por segundo (aproximação para estimativa de custo)
export const AUDIO_TOKENS_PER_SECOND: Record<'gemini' | 'openai', number> = {
  gemini: 32,
  openai: 10,
}
