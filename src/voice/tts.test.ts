import { describe, expect, it } from 'vitest'
import { decodeTtsAudio } from './tts'

describe('TTS format handling', () => {
  it('extracts WAV samples instead of playing the RIFF header as audio', () => {
    const bytes = new Uint8Array(48)
    const view = new DataView(bytes.buffer)
    const tag = (at: number, value: string) => bytes.set(new TextEncoder().encode(value), at)
    tag(0, 'RIFF'); view.setUint32(4, 40, true); tag(8, 'WAVE')
    tag(12, 'fmt '); view.setUint32(16, 16, true)
    view.setUint16(20, 1, true); view.setUint16(22, 1, true)
    view.setUint32(24, 24000, true); view.setUint16(34, 16, true)
    tag(36, 'data'); view.setUint32(40, 4, true)
    view.setInt16(44, 1000, true); view.setInt16(46, -1000, true)
    expect(decodeTtsAudio(bytes, 'audio/wav', 24000)).toEqual(bytes.slice(44))
    expect(() => decodeTtsAudio(bytes.slice(0, 47), 'audio/wav', 24000)).toThrow('Truncated')
  })

  it('accepts raw PCM and rejects unknown formats', () => {
    expect(decodeTtsAudio(new Uint8Array(4), 'audio/pcm', 24000)).toHaveLength(4)
    expect(() => decodeTtsAudio(new Uint8Array(4), 'audio/mp3', 24000)).toThrow('Unsupported')
  })
})
