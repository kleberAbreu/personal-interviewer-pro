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
  // ── Google Gemini ──────────────────────────────────────────────
  // (verificado nas docs oficiais em 13/06/2026; modelos Live antigos
  //  gemini-2.0-flash-live-001 e gemini-live-2.5-flash-preview foram
  //  desligados em 09/12/2025; gemini-3-pro-preview em 09/03/2026.)
  {
    provider: 'gemini', id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro',
    inputPerM: 2.0, outputPerM: 12.0,
    note: 'Raciocínio forte. Substitui o gemini-3-pro-preview (desligado em 09/03/2026).',
  },
  {
    provider: 'gemini', id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash',
    inputPerM: 0.3, outputPerM: 2.5,
    note: 'Rápido e barato. Suficiente para pesquisa de empresa.',
  },
  {
    provider: 'gemini', id: 'gemini-2.5-flash-native-audio-preview-12-2025', label: 'Gemini 2.5 Flash Native Audio (Live)',
    inputPerM: 0.5, outputPerM: 2.0, audioInputPerM: 3.0, audioOutputPerM: 12.0, voice: true,
    note: 'Voz nativa de altíssima qualidade via Live API. Atual (12-2025), roda em v1beta, transcrição dos dois lados + tools. Recomendado.',
  },
  {
    provider: 'gemini', id: 'gemini-3.1-flash-live-preview', label: 'Gemini 3.1 Flash Live (preview)',
    inputPerM: 0.75, outputPerM: 4.5, audioInputPerM: 3.0, audioOutputPerM: 12.0, voice: true,
    note: 'Modelo Live mais novo. Function calling sequencial (blocking). Em preview.',
  },

  // ── OpenAI ───────────────────────────────────────────────────────
  {
    provider: 'openai', id: 'gpt-5.5', label: 'GPT-5.5',
    inputPerM: 5.0, outputPerM: 30.0,
    note: 'Flagship OpenAI. Excelente para análise e relatório.',
  },
  {
    provider: 'openai', id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini',
    inputPerM: 0.75, outputPerM: 4.5,
    note: 'Variante mini mais nova (não existe gpt-5.5-mini). Custo baixo para pesquisa.',
  },
  {
    provider: 'openai', id: 'gpt-realtime', label: 'GPT Realtime (voz)',
    inputPerM: 4.0, outputPerM: 24.0, audioInputPerM: 32.0, audioOutputPerM: 64.0, voice: true,
    note: 'Voz em tempo real via OpenAI Realtime API (GA). Prosódia excelente em inglês. Auth no navegador via subprotocolo (uso pessoal).',
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
    provider: 'openrouter', id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (via OpenRouter)',
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
    recommended: { provider: 'anthropic', model: 'claude-opus-4-8' },
    alternatives: [
      { provider: 'openai', model: 'gpt-5.5' },
      { provider: 'gemini', model: 'gemini-3.1-pro-preview' },
      { provider: 'anthropic', model: 'claude-sonnet-4-6' },
    ],
    rationale:
      'Um brief preciso melhora tudo que vem depois: o Opus 4.8 infere cultura e estilo de entrevista com mais nuance e menos invenção. Para economizar, Gemini 3.1 Pro ou Sonnet 4.6 dão conta.',
  },
  planner: {
    title: 'Planejador (Roteiro da entrevista)',
    description: 'Cria o roteiro adaptativo em blocos cronometrados, com rubrica e guardrails.',
    recommended: { provider: 'anthropic', model: 'claude-opus-4-8' },
    alternatives: [
      { provider: 'anthropic', model: 'claude-fable-5' },
      { provider: 'openai', model: 'gpt-5.5' },
      { provider: 'gemini', model: 'gemini-3.1-pro-preview' },
    ],
    rationale:
      'Boas perguntas definem a qualidade da simulação. Claude Opus 4.8 calibra perguntas comportamentais e técnicas por senioridade com precisão de entrevistador experiente.',
  },
  interviewer: {
    title: 'Entrevistador (voz em tempo real)',
    description: 'Conduz a entrevista por voz (pt-BR ou inglês), com follow-ups dinâmicos.',
    recommended: { provider: 'gemini', model: 'gemini-2.5-flash-native-audio-preview-12-2025' },
    alternatives: [
      { provider: 'gemini', model: 'gemini-3.1-flash-live-preview' },
      { provider: 'openai', model: 'gpt-realtime' },
    ],
    rationale:
      'Apenas Gemini Live e OpenAI Realtime suportam conversa de voz no navegador. O Native Audio 12-2025 é o atual e dá a voz pt-BR mais natural (roda em v1beta, sem acesso especial). O 3.1 Flash Live é o mais novo. GPT Realtime tem prosódia excelente em inglês.',
  },
  analyst: {
    title: 'Analista (Relatório de performance)',
    description: 'Audita a transcrição e gera o relatório com notas, evidências e plano de treino.',
    recommended: { provider: 'anthropic', model: 'claude-fable-5' },
    alternatives: [
      { provider: 'anthropic', model: 'claude-opus-4-8' },
      { provider: 'openai', model: 'gpt-5.5' },
      { provider: 'gemini', model: 'gemini-3.1-pro-preview' },
    ],
    rationale:
      'A função mais sensível à inteligência: exige avaliação crítica sem alucinação e citações literais. Claude Fable 5 é o teto de qualidade em análise baseada em evidências; Opus 4.8 entrega quase o mesmo por metade do custo.',
  },
}

// Padrão de fábrica: melhor modelo por função (foco em qualidade, não economia).
// Requer chaves Anthropic (texto) + Gemini (voz). O contador de custos usa os
// preços do catálogo acima normalmente. Alternativas econômicas no painel de Modelos.
export const DEFAULT_MODELS: Record<AgentRole, ModelRef> = {
  researcher: { provider: 'anthropic', model: 'claude-opus-4-8' },
  planner: { provider: 'anthropic', model: 'claude-opus-4-8' },
  interviewer: { provider: 'gemini', model: 'gemini-2.5-flash-native-audio-preview-12-2025' },
  analyst: { provider: 'anthropic', model: 'claude-fable-5' },
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
