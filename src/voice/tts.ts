import { GoogleGenAI, Modality } from '@google/genai'
import { b64Decode, PcmPlayer } from './audio'

// Cliente Gemini TTS: sintetiza a fala da IA Candidata e toca no navegador.
// O áudio retornado é PCM16 mono a 24kHz (mesmo formato do Gemini Live).

export interface TtsRequest {
  apiKey: string
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
    const ai = new GoogleGenAI({ apiKey: req.apiKey })
    const response = await ai.models.generateContent({
      model: req.model,
      contents: [{ role: 'user', parts: [{ text: req.text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: req.voiceName } } },
      },
    })

    const data = response.candidates?.[0]?.content?.parts
      ?.find((p) => p.inlineData?.data)?.inlineData?.data
    if (!data) throw new Error('O Gemini TTS não retornou áudio. Verifique o modelo TTS em Configurações → Modelos.')

    const bytes = b64Decode(data)
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
