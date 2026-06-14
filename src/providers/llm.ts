import Anthropic from '@anthropic-ai/sdk'
import type { ApiKeys, ModelRef, TokenUsage } from '../types'

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

function requireKey(value: string, label: string): string {
  if (!value?.trim()) {
    throw new Error(`Chave de API ${label} não configurada. Abra Configurações → Chaves de API.`)
  }
  return value.trim()
}

async function chatGemini(p: ChatParams): Promise<ChatResult> {
  const key = requireKey(p.keys.gemini, 'Google Gemini')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${p.ref.model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: p.system }] },
        contents: [{ role: 'user', parts: [{ text: p.user }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: p.maxTokens ?? 20000,
          responseMimeType: 'application/json',
        },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  const parts: Array<{ text?: string }> = data?.candidates?.[0]?.content?.parts ?? []
  return {
    text: parts.map((x) => x.text ?? '').join(''),
    usage: {
      inputTokens: data?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
    },
  }
}

async function chatOpenAiCompatible(
  p: ChatParams,
  baseUrl: string,
  key: string,
  extraHeaders: Record<string, string> = {},
  jsonMode = true,
): Promise<ChatResult> {
  const body: Record<string, unknown> = {
    model: p.ref.model,
    messages: [
      { role: 'system', content: p.system },
      { role: 'user', content: p.user },
    ],
    max_completion_tokens: p.maxTokens ?? 20000,
  }
  if (jsonMode) body.response_format = { type: 'json_object' }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${baseUrl.includes('openrouter') ? 'OpenRouter' : 'OpenAI'} ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  return {
    text: data?.choices?.[0]?.message?.content ?? '',
    usage: {
      inputTokens: data?.usage?.prompt_tokens ?? 0,
      outputTokens: data?.usage?.completion_tokens ?? 0,
    },
  }
}

async function chatAnthropic(p: ChatParams): Promise<ChatResult> {
  const key = requireKey(p.keys.anthropic, 'Anthropic')
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true })
  // STREAMING obrigatório: o SDK recusa requisições não-streaming que estima
  // passarem de ~10 min (acontece com max_tokens alto + transcrições longas de
  // entrevistas de 30+ min). .finalMessage() devolve a Message completa.
  // Fable 5 / Opus 4.8 não aceitam temperature/top_p — não enviar.
  const stream = client.messages.stream({
    model: p.ref.model,
    max_tokens: p.maxTokens ?? 16000,
    system: p.system,
    messages: [{ role: 'user', content: p.user }],
  })
  const response = await stream.finalMessage()
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return {
    text,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}

export async function chatJson(p: ChatParams): Promise<ChatResult> {
  switch (p.ref.provider) {
    case 'gemini':
      return chatGemini(p)
    case 'openai':
      return chatOpenAiCompatible(p, 'https://api.openai.com/v1', requireKey(p.keys.openai, 'OpenAI'))
    case 'openrouter':
      // response_format nem sempre é suportado pelos modelos roteados — confia no prompt + extração
      return chatOpenAiCompatible(
        p,
        'https://openrouter.ai/api/v1',
        requireKey(p.keys.openrouter, 'OpenRouter'),
        { 'HTTP-Referer': 'https://github.com/kleberAbreu/personal-interviewer-pro', 'X-Title': 'Personal Interviewer Pro' },
        false,
      )
    case 'anthropic':
      return chatAnthropic(p)
  }
}
