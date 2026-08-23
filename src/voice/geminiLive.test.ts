import type { LiveServerMessage } from '@google/genai/web'
import { describe, expect, it } from 'vitest'
import { parseGeminiServerMessage } from './geminiLive'

describe('Gemini Live event parser', () => {
  it('processes every audio part in a single model turn', () => {
    const parsed = parseGeminiServerMessage({
      serverContent: {
        modelTurn: {
          role: 'model',
          parts: [
            { inlineData: { data: 'YQ==', mimeType: 'audio/pcm' } },
            { text: 'ignored text part' },
            { inlineData: { data: 'Yg==', mimeType: 'audio/pcm' } },
          ],
        },
        outputTranscription: { text: 'Hello' },
        inputTranscription: { text: 'Hi' },
        turnComplete: true,
      },
    } as LiveServerMessage)
    expect(parsed.audioChunks).toEqual(['YQ==', 'Yg=='])
    expect(parsed.interviewerTranscript).toBe('Hello')
    expect(parsed.candidateTranscript).toBe('Hi')
    expect(parsed.turnComplete).toBe(true)
  })

  it('surfaces GoAway and resumable handles', () => {
    const parsed = parseGeminiServerMessage({
      goAway: { timeLeft: '10s' },
      sessionResumptionUpdate: { resumable: true, newHandle: 'resume-handle' },
    } as LiveServerMessage)
    expect(parsed.goAway).toBe(true)
    expect(parsed.goAwayTimeLeft).toBe('10s')
    expect(parsed.resumeHandle).toBe('resume-handle')
  })
})
