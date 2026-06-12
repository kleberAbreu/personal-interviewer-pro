import { AUDIO_TOKENS_PER_SECOND, modelInfo } from '../config/models'
import type { ModelRef, TokenUsage } from '../types'

export function textCostUsd(ref: ModelRef, usage: TokenUsage): number {
  const info = modelInfo(ref)
  // Modelo customizado fora do catálogo: usa um preço médio conservador
  const inPerM = info?.inputPerM ?? 3.0
  const outPerM = info?.outputPerM ?? 15.0
  return (usage.inputTokens / 1_000_000) * inPerM + (usage.outputTokens / 1_000_000) * outPerM
}

export function voiceCostUsd(ref: ModelRef, audioInSeconds: number, audioOutSeconds: number): number {
  const info = modelInfo(ref)
  const tps = AUDIO_TOKENS_PER_SECOND[ref.provider === 'openai' ? 'openai' : 'gemini']
  const inPerM = info?.audioInputPerM ?? 3.0
  const outPerM = info?.audioOutputPerM ?? 12.0
  return (
    ((audioInSeconds * tps) / 1_000_000) * inPerM +
    ((audioOutSeconds * tps) / 1_000_000) * outPerM
  )
}

export function formatBrl(usd: number, usdToBrl: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 3,
  }).format(usd * usdToBrl)
}

export function formatUsd(usd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
  }).format(usd)
}
