import { GoogleGenAI, Modality, Type, type LiveServerMessage } from '@google/genai'
import { b64Decode, b64Encode, floatTo16BitPcmBytes, MicCapture, PcmPlayer } from './audio'
import type { VoiceCallbacks, VoiceSession, VoiceSessionOptions } from './types'

// Sessão de voz via Gemini Live API.
// Captura mic em 16kHz, toca resposta em 24kHz e grava transcrição
// dos DOIS lados (inputAudioTranscription + outputAudioTranscription).
export async function startGeminiLive(
  opts: VoiceSessionOptions,
  cb: VoiceCallbacks,
): Promise<VoiceSession> {
  const ai = new GoogleGenAI({ apiKey: opts.apiKey })
  const mic = new MicCapture()
  const player = new PcmPlayer(24000)
  let closed = false
  let endRequested = false

  // Fragmentos de transcrição acumulados até o fim do turno
  let pendingInterviewer = ''
  let pendingCandidate = ''

  const flushTranscripts = () => {
    if (pendingInterviewer.trim()) cb.onTranscript('interviewer', pendingInterviewer.trim())
    if (pendingCandidate.trim()) cb.onTranscript('candidate', pendingCandidate.trim())
    pendingInterviewer = ''
    pendingCandidate = ''
  }

  const sessionPromise = ai.live.connect({
    model: opts.model,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voiceName } },
        languageCode: opts.language,
      },
      systemInstruction: opts.systemInstruction,
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      tools: [
        {
          functionDeclarations: [
            {
              name: 'end_interview',
              description:
                'Must be called immediately after the interviewer says goodbye and the interview is finished, to close the session.',
              parameters: { type: Type.OBJECT, properties: {} },
            },
          ],
        },
      ],
    },
    callbacks: {
      onopen: () => {
        if (closed) return
        cb.onOpen()
        void mic.start(16000, (chunk, durationSec) => {
          cb.onAudioSeconds(durationSec, 0)
          let sum = 0
          for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i]
          cb.onAudioLevel(Math.sqrt(sum / chunk.length))
          const data = b64Encode(floatTo16BitPcmBytes(chunk))
          sessionPromise
            .then((s) => s.sendRealtimeInput({ media: { data, mimeType: 'audio/pcm;rate=16000' } }))
            .catch(() => {/* frame perdido em erro transitório */})
        }).catch((e: unknown) => cb.onError(e instanceof Error ? e.message : 'Falha ao acessar o microfone'))
      },
      onmessage: (message: LiveServerMessage) => {
        if (closed) return
        const content = message.serverContent

        // Áudio do entrevistador
        const inline = content?.modelTurn?.parts?.find((p) => p.inlineData?.data)?.inlineData
        if (inline?.data) {
          const bytes = b64Decode(inline.data)
          cb.onAudioSeconds(0, bytes.length / 2 / 24000)
          player.playPcm16(bytes)
        }

        // Transcrições (entrevistador = output, candidato = input)
        if (content?.outputTranscription?.text) pendingInterviewer += content.outputTranscription.text
        if (content?.inputTranscription?.text) pendingCandidate += content.inputTranscription.text
        if (content?.turnComplete) flushTranscripts()

        // Barge-in: usuário interrompeu o modelo
        if (content?.interrupted) player.interrupt()

        // Tool call de encerramento
        if (message.toolCall?.functionCalls?.some((c) => c.name === 'end_interview') && !endRequested) {
          endRequested = true
          flushTranscripts()
          cb.onEndRequested(player.remainingSeconds())
        }
      },
      onerror: (e: ErrorEvent) => {
        if (!closed) cb.onError(e.message || 'Erro na conexão Gemini Live')
      },
      onclose: () => {
        if (!closed) cb.onClose()
      },
    },
  })

  sessionPromise.catch((e: unknown) =>
    cb.onError(e instanceof Error ? e.message : 'Falha ao conectar ao Gemini Live'),
  )

  return {
    setMuted: (muted) => { mic.muted = muted },
    stop: () => {
      closed = true
      flushTranscripts()
      mic.stop()
      player.close()
      sessionPromise.then((s) => s.close()).catch(() => {})
    },
  }
}
