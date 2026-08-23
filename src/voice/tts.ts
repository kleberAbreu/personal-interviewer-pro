import { b64Decode, PcmPlayer } from './audio'

// Gemini TTS player: requests candidate speech from the loopback broker and
// plays the returned mono PCM16 audio at 24kHz.

export interface TtsRequest {
  /** Modelo TTS (ex.: gemini-2.5-flash-tts). */
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
    const body = await response.json().catch(() => ({})) as { audio?: string; error?: string }
    if (!response.ok || !body.audio) throw new Error(body.error || 'Gemini TTS did not return audio.')

    const bytes = b64Decode(body.audio)
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
