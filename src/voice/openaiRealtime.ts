import { b64Decode, b64Encode, floatTo16BitPcmBytes, MicCapture, PcmPlayer } from './audio'
import type { VoiceCallbacks, VoiceSession, VoiceSessionOptions } from './types'

// Sessão de voz via OpenAI Realtime API (WebSocket direto do navegador).
// Áudio PCM16 mono 24kHz nos dois sentidos; transcrição do candidato via
// input_audio_transcription e do entrevistador via audio_transcript.
//
// Nota: a autenticação usa o subprotocolo "openai-insecure-api-key" —
// adequado para uso pessoal/local; em produção usaria token efêmero via backend.
export async function startOpenAiRealtime(
  opts: VoiceSessionOptions,
  cb: VoiceCallbacks,
): Promise<VoiceSession> {
  const mic = new MicCapture()
  const player = new PcmPlayer(24000)
  let closed = false
  let endRequested = false
  let opened = false

  const ws = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(opts.model)}`,
    ['realtime', `openai-insecure-api-key.${opts.apiKey}`, 'openai-beta.realtime-v1'],
  )

  const send = (obj: unknown) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj))
  }

  ws.onopen = () => {
    if (closed) return
    // Estrutura GA da Realtime API (modelo gpt-realtime): config de áudio
    // aninhada em audio.input/output e output_modalities (não mais os campos
    // planos modalities/voice/input_audio_format do antigo gpt-4o-realtime-preview).
    send({
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: opts.systemInstruction,
        output_modalities: ['audio'],
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24000 },
            turn_detection: { type: 'semantic_vad' },
            transcription: { model: 'whisper-1' },
          },
          output: {
            format: { type: 'audio/pcm', rate: 24000 },
            voice: opts.voiceName,
          },
        },
        tools: [
          {
            type: 'function',
            name: 'end_interview',
            description:
              'Must be called immediately after the interviewer says goodbye and the interview is finished, to close the session.',
            parameters: { type: 'object', properties: {} },
          },
        ],
      },
    })
    // Faz o entrevistador abrir a conversa
    send({ type: 'response.create' })

    opened = true
    cb.onOpen()
    void mic.start(24000, (chunk, durationSec) => {
      cb.onAudioSeconds(durationSec, 0)
      let sum = 0
      for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i]
      cb.onAudioLevel(Math.sqrt(sum / chunk.length))
      send({ type: 'input_audio_buffer.append', audio: b64Encode(floatTo16BitPcmBytes(chunk)) })
    }).catch((e: unknown) => cb.onError(e instanceof Error ? e.message : 'Falha ao acessar o microfone'))
  }

  ws.onmessage = (event) => {
    if (closed) return
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(String(event.data))
    } catch {
      return
    }
    const type = String(msg.type ?? '')

    // Áudio do entrevistador (nomes variam entre versões beta/GA da API)
    if (type === 'response.audio.delta' || type === 'response.output_audio.delta') {
      const bytes = b64Decode(String(msg.delta ?? ''))
      cb.onAudioSeconds(0, bytes.length / 2 / 24000)
      player.playPcm16(bytes)
      return
    }

    // Transcrição do entrevistador (turno completo)
    if (type === 'response.audio_transcript.done' || type === 'response.output_audio_transcript.done') {
      const text = String(msg.transcript ?? '').trim()
      if (text) cb.onTranscript('interviewer', text)
      return
    }

    // Transcrição do candidato
    if (type === 'conversation.item.input_audio_transcription.completed') {
      const text = String(msg.transcript ?? '').trim()
      if (text) cb.onTranscript('candidate', text)
      return
    }

    // Barge-in: usuário começou a falar enquanto o modelo tocava áudio
    if (type === 'input_audio_buffer.speech_started') {
      player.interrupt()
      return
    }

    // Tool call de encerramento
    if (type === 'response.function_call_arguments.done' && msg.name === 'end_interview' && !endRequested) {
      endRequested = true
      cb.onEndRequested(player.remainingSeconds())
      return
    }
    if (type === 'response.done' && !endRequested) {
      const output = (msg.response as { output?: Array<{ type?: string; name?: string }> } | undefined)?.output ?? []
      if (output.some((o) => o.type === 'function_call' && o.name === 'end_interview')) {
        endRequested = true
        cb.onEndRequested(player.remainingSeconds())
      }
      return
    }

    if (type === 'error') {
      const err = msg.error as { message?: string } | undefined
      cb.onError(err?.message ?? 'Erro na OpenAI Realtime API')
    }
  }

  ws.onerror = () => {
    if (!closed && !opened) cb.onError('Falha ao conectar à OpenAI Realtime API. Verifique a chave OpenAI.')
  }
  ws.onclose = () => {
    if (!closed) cb.onClose()
  }

  return {
    setMuted: (muted) => { mic.muted = muted },
    setPaused: (paused) => {
      mic.muted = paused
      if (paused) player.pause()
      else player.resume()
    },
    stop: () => {
      closed = true
      mic.stop()
      player.close()
      try { ws.close() } catch { /* já fechado */ }
    },
  }
}
