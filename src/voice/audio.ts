// Utilitários de áudio: captura do microfone em PCM16 e player com fila.

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

  /** Inicia a captura; onChunk recebe Float32Array no sampleRate pedido. */
  async start(sampleRate: number, onChunk: (chunk: Float32Array, durationSec: number) => void): Promise<void> {
    this.ctx = new AudioContext({ sampleRate })
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    })
    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1)
    this.processor.onaudioprocess = (e) => {
      if (this.muted) return
      const input = e.inputBuffer.getChannelData(0)
      onChunk(new Float32Array(input), input.length / sampleRate)
    }
    this.source.connect(this.processor)
    this.processor.connect(this.ctx.destination)
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
    this.ctx = new AudioContext({ sampleRate })
  }

  /** Enfileira PCM16 mono (bytes) para reprodução contínua. */
  playPcm16(bytes: Uint8Array): void {
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
