import { GoogleGenAI, Modality, Type, type LiveServerMessage, type Session } from '@google/genai'
import { b64Decode, b64Encode, floatTo16BitPcmBytes, MicCapture, PcmPlayer } from './audio'
import type { VoiceCallbacks, VoiceSession, VoiceSessionOptions } from './types'

// Sessão de voz via Gemini Live API.
// Captura mic em 16kHz, toca resposta em 24kHz e grava transcrição
// dos DOIS lados (inputAudioTranscription + outputAudioTranscription).
export async function startGeminiLive(
  opts: VoiceSessionOptions,
  cb: VoiceCallbacks,
): Promise<VoiceSession> {
  // v1beta cobre os modelos Live atuais (native audio 12-2025, 3.1 flash live),
  // incluindo transcrição dos dois lados e function calling. v1alpha só é
  // necessário para affective dialog / proactive audio, que não usamos.
  const ai = new GoogleGenAI({ apiKey: opts.apiKey, httpOptions: { apiVersion: 'v1beta' } })
  const mic = new MicCapture()
  const player = new PcmPlayer(24000)
  let closed = false
  let endRequested = false
  let kickoffSent = false
  let reconnecting = false
  let suppressNextClose = false
  let session: Session | null = null
  let sessionPromise: Promise<Session> | null = null
  let resumeHandle: string | undefined
  // Texto (fala da candidata no modo espectador) aguardando sessão disponível.
  // Reenviado ao reconectar para não perder o turno numa janela de GoAway.
  const pendingText: string[] = []
  // Atraso curto do onTurnComplete: se um end_interview chegar logo após o
  // turnComplete da despedida, cancelamos o turno da candidata.
  let turnCompleteTimer: ReturnType<typeof setTimeout> | null = null

  // Fragmentos de transcrição acumulados até o fim do turno
  let pendingInterviewer = ''
  let pendingCandidate = ''

  const flushTranscripts = () => {
    if (pendingInterviewer.trim()) cb.onTranscript('interviewer', pendingInterviewer.trim())
    if (pendingCandidate.trim()) cb.onTranscript('candidate', pendingCandidate.trim())
    pendingInterviewer = ''
    pendingCandidate = ''
  }

  const doSendText = (text: string): boolean => {
    if (!session || reconnecting) return false
    try {
      session.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      })
      return true
    } catch (e) {
      console.warn('[voice] sendText falhou:', e)
      return false
    }
  }

  // Reenvia, em ordem, os textos que ficaram na fila enquanto a sessão estava
  // indisponível (reconexão). Para no primeiro que ainda não puder ser enviado.
  const flushPendingText = () => {
    while (pendingText.length) {
      if (!doSendText(pendingText[0])) break
      pendingText.shift()
    }
  }

  const startMic = () => {
    void mic.start(16000, (chunk, durationSec) => {
      cb.onAudioSeconds(durationSec, 0)
      let sum = 0
      for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i]
      cb.onAudioLevel(Math.sqrt(sum / chunk.length))
      if (!session || reconnecting) return
      const data = b64Encode(floatTo16BitPcmBytes(chunk))
      try {
        session.sendRealtimeInput({ audio: { data, mimeType: 'audio/pcm;rate=16000' } })
      } catch {
        // Frame perdido durante troca de conexão ou erro transitório.
      }
    }).catch((e: unknown) => cb.onError(e instanceof Error ? e.message : 'Falha ao acessar o microfone'))
  }

  const reconnectAfterGoAway = (timeLeft?: string) => {
    if (closed || reconnecting || endRequested) return
    if (!resumeHandle) {
      cb.onError('O Gemini vai encerrar a conexão e ainda não enviou um handle de retomada. Encerre e reinicie a entrevista.')
      return
    }

    console.info('[voice] Gemini Live GoAway recebido; reconectando antes do abort.', timeLeft ? `timeLeft=${timeLeft}` : '')
    reconnecting = true
    suppressNextClose = true
    flushTranscripts()

    const oldSession = session
    session = null
    try { oldSession?.close() } catch { /* conexão já fechando */ }
    connectSession().catch((e: unknown) =>
      cb.onError(e instanceof Error ? e.message : 'Falha ao retomar a sessão Gemini Live'),
    )
  }

  const connectSession = async () => {
    let connectingPromise: Promise<Session> | null = null
    connectingPromise = ai.live.connect({
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
        // 'transparent' NÃO é suportado no Developer API (só Vertex/Enterprise) —
        // o SDK lança erro se enviado. Omitimos: a retomada por handle já funciona.
        sessionResumption: { handle: resumeHandle },
        contextWindowCompression: { slidingWindow: {} },
        tools: opts.enableEndTool === false ? undefined : [
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
          console.info('[voice] Gemini Live conectado:', opts.model, resumeHandle ? '(resumido)' : '')
          cb.onOpen()

          if (!kickoffSent) {
            kickoffSent = true
            // Kickoff: pede ao entrevistador que comece (Gemini não fala sem input).
            // A sessão da candidata (dual-live) não usa kickoff: responde ao áudio recebido.
            if (opts.kickoff !== false) {
              connectingPromise
                ?.then((s) => s.sendClientContent({
                  turns: [{
                    role: 'user',
                    parts: [{ text: opts.language === 'en-US' ? '(The candidate has joined. Greet them and start the interview.)' : '(O candidato entrou. Cumprimente-o e inicie a entrevista.)' }],
                  }],
                  turnComplete: true,
                }))
                .catch((e: unknown) => console.warn('[voice] kickoff falhou:', e))
            }

            // Modo espectador: sem microfone — a candidata entra por sendText/sendAudio.
            if (opts.captureMic !== false) startMic()
          }
        },
        onmessage: (message: LiveServerMessage) => {
          if (closed) return

          const resumptionUpdate = message.sessionResumptionUpdate
          if (resumptionUpdate?.resumable && resumptionUpdate.newHandle) {
            resumeHandle = resumptionUpdate.newHandle
          }

          if (message.goAway) {
            reconnectAfterGoAway(message.goAway.timeLeft)
            return
          }

          const content = message.serverContent

          // Áudio do entrevistador
          const inline = content?.modelTurn?.parts?.find((p) => p.inlineData?.data)?.inlineData
          if (inline?.data) {
            const bytes = b64Decode(inline.data)
            cb.onAudioSeconds(0, bytes.length / 2 / 24000)
            player.playPcm16(bytes)
            cb.onAudioChunk?.(bytes)
          }

          // Transcrições (entrevistador = output, candidato = input)
          if (content?.outputTranscription?.text) pendingInterviewer += content.outputTranscription.text
          if (content?.inputTranscription?.text) pendingCandidate += content.inputTranscription.text
          if (content?.turnComplete) {
            flushTranscripts()
            if (!endRequested && cb.onTurnComplete) {
              // Atraso curto: dá tempo de um end_interview (despedida) chegar e
              // cancelar este turno, evitando uma resposta desnecessária da candidata.
              if (turnCompleteTimer) clearTimeout(turnCompleteTimer)
              turnCompleteTimer = setTimeout(() => {
                turnCompleteTimer = null
                if (!closed && !endRequested) cb.onTurnComplete?.()
              }, 250)
            }
          }

          // Barge-in: usuário interrompeu o modelo
          if (content?.interrupted) player.interrupt()

          // Tool call de encerramento
          if (message.toolCall?.functionCalls?.some((c) => c.name === 'end_interview') && !endRequested) {
            endRequested = true
            if (turnCompleteTimer) { clearTimeout(turnCompleteTimer); turnCompleteTimer = null }
            flushTranscripts()
            cb.onEndRequested(player.remainingSeconds())
          }
        },
        onerror: (e: ErrorEvent) => {
          console.error('[voice] Gemini Live erro:', e)
          if (!closed && !reconnecting) cb.onError(e.message || 'Erro na conexão Gemini Live (veja o console do navegador)')
        },
        onclose: (e: CloseEvent) => {
          console.warn('[voice] Gemini Live fechou · código', e?.code, '· motivo:', e?.reason || '(vazio)')
          if (suppressNextClose) {
            suppressNextClose = false
            return
          }

          // Para o microfone imediatamente: sem isto, cada frame tenta enviar num
          // socket morto e gera o loop "WebSocket is already in CLOSING or CLOSED".
          mic.stop()
          session = null
          if (!closed) {
            if (!endRequested && e?.reason) {
              cb.onError(`O Gemini encerrou a sessão: ${e.reason}${e.code ? ` (código ${e.code})` : ''}`)
            }
            cb.onClose()
          }
        },
      },
    })

    sessionPromise = connectingPromise
    const nextSession = await connectingPromise
    if (closed) {
      try { nextSession.close() } catch { /* já fechada */ }
      return
    }
    session = nextSession
    reconnecting = false
    // Sessão (re)disponível: escoa qualquer fala da candidata que ficou na fila.
    flushPendingText()
  }

  connectSession().catch((e: unknown) =>
    cb.onError(e instanceof Error ? e.message : 'Falha ao conectar ao Gemini Live'),
  )

  return {
    setMuted: (muted) => { mic.muted = muted },
    sendText: (text) => {
      if (!doSendText(text)) {
        pendingText.push(text)
        console.warn('[voice] sendText adiado: sessão indisponível; será reenviado ao reconectar')
      }
    },
    sendAudio: (pcm16kBytes) => {
      if (!session || reconnecting) return
      try {
        session.sendRealtimeInput({
          audio: { data: b64Encode(pcm16kBytes), mimeType: 'audio/pcm;rate=16000' },
        })
      } catch {
        // Frame perdido durante troca de conexão ou erro transitório.
      }
    },
    setPaused: (paused) => {
      // Não envia áudio do mic e suspende a reprodução; a sessão WebSocket segue
      // viva (contexto preservado). Se cair na pausa, a retomada por handle reconecta.
      mic.muted = paused
      if (paused) player.pause()
      else player.resume()
    },
    stop: () => {
      closed = true
      if (turnCompleteTimer) { clearTimeout(turnCompleteTimer); turnCompleteTimer = null }
      flushTranscripts()
      mic.stop()
      player.close()
      try { session?.close() } catch { /* já fechado */ }
      session = null
      sessionPromise?.then((s) => s.close()).catch(() => {})
    },
  }
}
