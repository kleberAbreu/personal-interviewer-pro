import type { ApiKeys, ModelRef, TokenUsage } from '../types'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const APP_REFERER = 'https://github.com/kleberAbreu/personal-interviewer-pro'
const APP_TITLE = 'Personal Interviewer Pro'

export interface ChatParams {
  ref: ModelRef
  keys: ApiKeys
  system: string
  user: string
  maxTokens?: number
}

export interface ChatResult {
  text: string
  usage: TokenUsage
}

function requireOpenRouterKey(keys: ApiKeys): string {
  if (!keys.openrouter?.trim()) {
    throw new Error('Chave de API OpenRouter não configurada. Abra Configurações → Chaves de API.')
  }
  return keys.openrouter.trim()
}

async function readError(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string }
    return parsed.error?.message ?? parsed.message ?? text.slice(0, 300)
  } catch {
    return text.slice(0, 300)
  }
}

export async function chatJson(p: ChatParams): Promise<ChatResult> {
  if (p.ref.provider !== 'openrouter') {
    throw new Error('Os agentes de texto usam apenas OpenRouter. Ajuste os modelos em Configurações → Modelos.')
  }

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${requireOpenRouterKey(p.keys)}`,
      'HTTP-Referer': APP_REFERER,
      'X-Title': APP_TITLE,
    },
    body: JSON.stringify({
      model: p.ref.model,
      messages: [
        { role: 'system', content: p.system },
        { role: 'user', content: p.user },
      ],
      max_completion_tokens: p.maxTokens ?? 20000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await readError(res)}`)
  const data = await res.json()
  return {
    text: data?.choices?.[0]?.message?.content ?? '',
    usage: {
      inputTokens: data?.usage?.prompt_tokens ?? 0,
      outputTokens: data?.usage?.completion_tokens ?? 0,
    },
  }
}
