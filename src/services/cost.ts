import { AUDIO_TOKENS_PER_SECOND, modelInfo } from '../config/models'
import type { ModelRef, TokenUsage, VoiceUsage } from '../types'

export function textCostUsd(ref: ModelRef, usage: TokenUsage): number {
  const info = modelInfo(ref)
  // Modelo customizado fora do catálogo: usa um preço médio conservador
  const inPerM = info?.inputPerM ?? 3.0
  const outPerM = info?.outputPerM ?? 15.0
  return (usage.inputTokens / 1_000_000) * inPerM + (usage.outputTokens / 1_000_000) * outPerM
}

export function emptyVoiceUsage(): VoiceUsage {
  return {
    inputAudioTokens: 0,
    outputAudioTokens: 0,
    inputTextTokens: 0,
    outputTextTokens: 0,
    cachedInputTokens: 0,
    estimated: false,
  }
}

export function addVoiceUsage(current: VoiceUsage, delta: VoiceUsage): VoiceUsage {
  return {
    inputAudioTokens: current.inputAudioTokens + delta.inputAudioTokens,
    outputAudioTokens: current.outputAudioTokens + delta.outputAudioTokens,
    inputTextTokens: current.inputTextTokens + delta.inputTextTokens,
    outputTextTokens: current.outputTextTokens + delta.outputTextTokens,
    cachedInputTokens: current.cachedInputTokens + delta.cachedInputTokens,
    estimated: current.estimated || delta.estimated,
  }
}

export function voiceCostUsd(ref: ModelRef, usage: VoiceUsage): number {
  const info = modelInfo(ref)
  const textInputPerM = info?.inputPerM ?? 3.0
  const textOutputPerM = info?.outputPerM ?? 15.0
  const inPerM = info?.audioInputPerM ?? 3.0
  const outPerM = info?.audioOutputPerM ?? 12.0
  return (
    (usage.inputTextTokens / 1_000_000) * textInputPerM +
    (usage.outputTextTokens / 1_000_000) * textOutputPerM +
    (usage.inputAudioTokens / 1_000_000) * inPerM +
    (usage.outputAudioTokens / 1_000_000) * outPerM
  )
}

// Preço estimado do Gemini TTS (saída de áudio) em USD por 1M de tokens de áudio.
// Estimativa conservadora alinhada ao pricing publicado do Gemini 2.5 Flash TTS.
export const TTS_AUDIO_OUTPUT_PER_M = 10.0

/** Custo estimado da voz TTS da candidata a partir dos segundos de áudio gerado. */
export function ttsCostUsd(audioOutSeconds: number): number {
  return ((audioOutSeconds * AUDIO_TOKENS_PER_SECOND) / 1_000_000) * TTS_AUDIO_OUTPUT_PER_M
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
