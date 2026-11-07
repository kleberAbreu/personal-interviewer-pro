import { b64Decode, PcmPlayer, resamplePcm16 } from './audio'

export function decodeTtsAudio(bytes: Uint8Array, mimeType: string, sampleRate: number): Uint8Array {
  if (/wav|wave/i.test(mimeType)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4))
    if (bytes.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Invalid TTS WAV audio.')
    let pcm: Uint8Array | undefined
    let validFormat = false
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const size = view.getUint32(offset + 4, true)
      const start = offset + 8
      if (start + size > bytes.length) throw new Error('Truncated TTS WAV audio.')
      if (tag(offset) === 'fmt ' && size >= 16) {
        validFormat = view.getUint16(start, true) === 1 && view.getUint16(start + 2, true) === 1 && view.getUint16(start + 14, true) === 16
        sampleRate = view.getUint32(start + 4, true)
      }
      if (tag(offset) === 'data') pcm = bytes.slice(start, start + size)
      offset = start + size + (size % 2)
    }
    if (!validFormat || !pcm) throw new Error('Unsupported TTS WAV format; expected mono PCM16.')
    bytes = pcm
  } else if (!/pcm|l16/i.test(mimeType)) throw new Error('Unsupported TTS audio format.')
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 96000 || bytes.length % 2) throw new Error('Invalid TTS PCM audio.')
  return sampleRate === 24000 ? bytes : resamplePcm16(bytes, sampleRate, 24000)
}

// Gemini TTS player: requests candidate speech from the loopback broker and
// plays the returned mono PCM16 audio at 24kHz.

export interface TtsRequest {
  /** Modelo TTS (ex.: gemini-3.8-flash-lite-tts). */
  model: string
  voiceName: string
  text: string
}

export class TtsSpeaker {
  private player = new PcmPlayer(24000)
  private closed = false

  /**
   * Sintetiza e reproduz o texto. Resolve com a duração do áudio (em segundos)
   * somente quando a reprodução TERMINA — o orquestrador usa isso para só
   * liberar o próximo turno depois que a candidata acabou de falar.
   */
  async speak(req: TtsRequest): Promise<number> {
    const response = await fetch('/api/voice/gemini/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    const body = await response.json().catch(() => ({})) as { audio?: string; error?: string; mimeType?: string; sampleRate?: number }
    if (!response.ok || !body.audio) throw new Error(body.error || 'Gemini TTS did not return audio.')

    const bytes = decodeTtsAudio(b64Decode(body.audio), body.mimeType ?? 'audio/pcm', body.sampleRate ?? 24000)
    const durationSec = bytes.length / 2 / 24000
    if (this.closed) return durationSec
    this.player.playPcm16(bytes)
    await this.waitPlayback()
    return durationSec
  }

  /** Aguarda a fila de reprodução esvaziar (respeita pausas do contexto). */
  private waitPlayback(): Promise<void> {
    return new Promise((resolve) => {
      const tick = () => {
        if (this.closed || this.player.remainingSeconds() <= 0.05) resolve()
        else setTimeout(tick, 150)
      }
      tick()
    })
  }

  pause(): void { this.player.pause() }
  resume(): void { this.player.resume() }

  close(): void {
    this.closed = true
    this.player.close()
  }
}
