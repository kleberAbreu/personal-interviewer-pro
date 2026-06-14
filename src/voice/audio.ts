// Utilitários de áudio: captura do microfone em PCM16 e player com fila.

/** Reamostragem linear simples de Float32 PCM (mono). */
export function downsample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return new Float32Array(input)
  const ratio = fromRate / toRate
  const outLen = Math.round(input.length / ratio)
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio
    const idx = Math.floor(pos)
    const frac = pos - idx
    const a = input[idx] ?? 0
    const b = input[idx + 1] ?? a
    out[i] = a + (b - a) * frac
  }
  return out
}

export function floatTo16BitPcmBytes(data: Float32Array): Uint8Array {
  const int16 = new Int16Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return new Uint8Array(int16.buffer)
}

export function b64Encode(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function b64Decode(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export class MicCapture {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private processor: ScriptProcessorNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  muted = false

  /**
   * Inicia a captura. onChunk recebe Float32Array reamostrado para `targetRate`
   * e a duração real (wall-clock) do trecho. Usa a taxa nativa do dispositivo e
   * reamostra por software — mais confiável que forçar a taxa no AudioContext.
   */
  async start(targetRate: number, onChunk: (chunk: Float32Array, durationSec: number) => void): Promise<void> {
    this.ctx = new AudioContext()
    // Autoplay policy: o contexto pode nascer suspenso. Sem isto, onaudioprocess
    // nunca dispara e nenhum áudio é enviado (sintoma: "falo e nada acontece").
    if (this.ctx.state === 'suspended') await this.ctx.resume()

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    const inRate = this.ctx.sampleRate
    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1)
    this.processor.onaudioprocess = (e) => {
      if (this.muted) return
      const input = e.inputBuffer.getChannelData(0)
      const durationSec = input.length / inRate
      const chunk = inRate === targetRate ? new Float32Array(input) : downsample(input, inRate, targetRate)
      onChunk(chunk, durationSec)
    }
    this.source.connect(this.processor)
    this.processor.connect(this.ctx.destination)
    console.info(`[voice] mic ativo · taxa nativa ${inRate}Hz → ${targetRate}Hz · ctx=${this.ctx.state}`)
  }

  stop(): void {
    this.processor?.disconnect()
    this.source?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.ctx?.close()
    this.processor = null
    this.source = null
    this.stream = null
    this.ctx = null
  }
}

export class PcmPlayer {
  private ctx: AudioContext
  private sampleRate: number
  private nextStartTime = 0
  private sources = new Set<AudioBufferSourceNode>()
  totalPlayedSeconds = 0

  constructor(sampleRate: number = 24000) {
    this.sampleRate = sampleRate
    // Contexto na taxa nativa; os buffers declaram 24kHz e a Web Audio API
    // reamostra na reprodução. Forçar a taxa do contexto falha em alguns aparelhos.
    this.ctx = new AudioContext()
  }

  /** Enfileira PCM16 mono (bytes) para reprodução contínua. */
  playPcm16(bytes: Uint8Array): void {
    // Autoplay policy: garante que o contexto esteja rodando antes de tocar.
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    const aligned = bytes.byteOffset % 2 === 0 && bytes.byteLength % 2 === 0
      ? bytes
      : bytes.slice()
    const int16 = new Int16Array(aligned.buffer, aligned.byteOffset, Math.floor(aligned.byteLength / 2))
    const buffer = this.ctx.createBuffer(1, int16.length, this.sampleRate)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < int16.length; i++) channel[i] = int16[i] / 32768
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.connect(this.ctx.destination)
    const startAt = Math.max(this.nextStartTime, this.ctx.currentTime)
    source.start(startAt)
    this.nextStartTime = startAt + buffer.duration
    this.totalPlayedSeconds += buffer.duration
    this.sources.add(source)
    source.onended = () => this.sources.delete(source)
  }

  /** Pausa a reprodução congelando o relógio do contexto (preserva a fila). */
  pause(): void {
    if (this.ctx.state === 'running') void this.ctx.suspend()
  }

  /** Retoma a reprodução de onde parou. */
  resume(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  /** Interrompe imediatamente tudo que está tocando/enfileirado (barge-in). */
  interrupt(): void {
    this.sources.forEach((s) => {
      try { s.stop() } catch { /* já parado */ }
    })
    this.sources.clear()
    this.nextStartTime = 0
  }

  /** Segundos de áudio que ainda faltam tocar. */
  remainingSeconds(): number {
    return Math.max(0, this.nextStartTime - this.ctx.currentTime)
  }

  close(): void {
    this.interrupt()
    void this.ctx.close()
  }
}
