import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatJson } from './llm'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('OpenRouter text model compatibility', () => {
  it.each([
    'openai/gpt-5.6-sol',
    'openai/gpt-5.6-terra',
    'openai/gpt-5.6-luna',
    'anthropic/claude-opus-5',
    'anthropic/claude-opus-5-fast',
    'anthropic/claude-sonnet-5',
  ])('sends %s through the shared structured-output path', async (model) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    await chatJson({
      ref: { provider: 'openrouter', model },
      keys: { openrouter: 'test-openrouter-key' },
      system: 'Return JSON.',
      user: 'Test request.',
      maxTokens: 1234,
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(body).toMatchObject({
      model,
      max_tokens: 1234,
      response_format: { type: 'json_object' },
    })
    expect(body).not.toHaveProperty('max_completion_tokens')
  })
})
