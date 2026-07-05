import { candidatePrompt } from '../config/prompts'
import { chatText, type ChatTurn } from '../providers/llm'
import { textCostUsd } from '../services/cost'
import type { AgentResult, ApiKeys, InterviewConfig, ModelRef, TranscriptEntry } from '../types'

/**
 * Converte a transcrição em histórico de chat da PERSPECTIVA DA CANDIDATA:
 * falas do entrevistador viram 'user', falas da candidata viram 'assistant'.
 * Turnos consecutivos do mesmo papel são mesclados (o Gemini Live pode emitir
 * a fala do entrevistador em mais de um fragmento).
 */
export function transcriptToChatTurns(transcript: TranscriptEntry[]): ChatTurn[] {
  const turns: ChatTurn[] = []
  for (const entry of transcript) {
    const role = entry.role === 'interviewer' ? 'user' : 'assistant'
    const last = turns[turns.length - 1]
    if (last && last.role === role) {
      last.content += `\n${entry.text}`
    } else {
      turns.push({ role, content: entry.text })
    }
  }
  return turns
}

/**
 * Gera a próxima fala da IA Candidata a partir da transcrição acumulada.
 * A última entrada deve ser do entrevistador (a pergunta a responder).
 */
export async function runCandidateTurn(
  config: InterviewConfig,
  transcript: TranscriptEntry[],
  ref: ModelRef,
  keys: ApiKeys,
): Promise<AgentResult<string>> {
  const messages = transcriptToChatTurns(transcript)
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    throw new Error('A candidata só responde após uma fala do entrevistador.')
  }

  const result = await chatText({
    ref,
    keys,
    system: candidatePrompt({
      language: config.interviewLanguage,
      area: config.customArea || config.area,
      interviewType: config.interviewType,
      stressMode: config.stressMode,
      jobDescription: config.jobDescription,
      cvText: config.cvText,
    }),
    messages,
    maxTokens: 1200,
  })

  const text = result.text.trim()
  if (!text) throw new Error('A IA Candidata devolveu uma resposta vazia. Tente novamente.')
  return { data: text, costUsd: textCostUsd(ref, result.usage) }
}
