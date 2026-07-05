import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Clock, DollarSign, Mic, MicOff, NotebookPen, Pause, PhoneOff, Play, RefreshCw } from 'lucide-react'
import { buildInterviewerPrompt } from '../config/prompts'
import { voiceCostUsd, formatBrl } from '../services/cost'
import { useSettings } from '../store'
import { startVoiceSession, type VoiceSession } from '../voice'
import type { CompanyBrief, InterviewConfig, InterviewPlan, TranscriptEntry } from '../types'
import { Button, Card } from './ui'

interface Props {
  config: InterviewConfig
  brief: CompanyBrief
  plan: InterviewPlan
  previousCostUsd: number
  onFinish: (transcript: TranscriptEntry[], voiceCost: number) => void
}

export default function LiveInterview({ config, brief, plan, previousCostUsd, onFinish }: Props) {
  const settings = useSettings()
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState(0)
  const [timeLeft, setTimeLeft] = useState(config.duration * 60)
  const [voiceCost, setVoiceCost] = useState(0)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])

  const sessionRef = useRef<VoiceSession | null>(null)
  const transcriptRef = useRef<TranscriptEntry[]>([])
  const audioSecondsRef = useRef({ input: 0, output: 0 })
  const finishedRef = useRef(false)
  const logRef = useRef<HTMLDivElement>(null)

  const interviewerRef = settings.models.interviewer

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    sessionRef.current?.stop()
    sessionRef.current = null
    const cost = voiceCostUsd(interviewerRef, audioSecondsRef.current.input, audioSecondsRef.current.output)
    onFinish(transcriptRef.current, cost)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFinish])

  const connect = useCallback(async () => {
    setError(null)
    setConnected(false)
    sessionRef.current?.stop()

    const apiKey = settings.keys.gemini
    if (!apiKey?.trim()) {
      setError('Chave Google Gemini não configurada (Configurações → Chaves de API).')
      return
    }

    const systemInstruction = buildInterviewerPrompt({
      template: settings.interviewerTemplate,
      language: config.interviewLanguage,
      durationMinutes: config.duration,
      companyBrief: brief.company_brief,
      styleProfile: brief.interview_style_profile,
      plan: plan.interview_plan,
      stressMode: config.stressMode,
      extraInstructions: settings.extraInstructions,
    })

    try {
      sessionRef.current = await startVoiceSession(interviewerRef, {
        apiKey: apiKey.trim(),
        model: interviewerRef.model,
        voiceName: config.voiceName,
        systemInstruction,
        language: config.interviewLanguage,
      }, {
        onOpen: () => setConnected(true),
        onAudioLevel: setLevel,
        onTranscript: (role, text) => {
          const entry: TranscriptEntry = { role, text, at: Date.now() }
          transcriptRef.current = [...transcriptRef.current, entry]
          setTranscript(transcriptRef.current)
        },
        onAudioSeconds: (inDelta, outDelta) => {
          audioSecondsRef.current.input += inDelta
          audioSecondsRef.current.output += outDelta
          setVoiceCost(voiceCostUsd(interviewerRef, audioSecondsRef.current.input, audioSecondsRef.current.output))
        },
        onEndRequested: (delaySec) => {
          // Espera o áudio da despedida terminar antes de encerrar
          setTimeout(finish, (delaySec + 1.5) * 1000)
        },
        onError: (msg) => {
          if (!finishedRef.current) {
            setConnected(false)
            setError(msg)
          }
        },
        onClose: () => setConnected(false),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao conectar')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Adia connect() para fora do corpo do efeito: evita setState síncrono no
    // effect (cascading renders) e satisfaz react-hooks/set-state-in-effect.
    const id = window.setTimeout(() => void connect(), 0)
    return () => {
      window.clearTimeout(id)
      sessionRef.current?.stop()
      sessionRef.current = null
    }
  }, [connect])

  // Timer (permite até 5 min de overtime) — congela durante a pausa
  useEffect(() => {
    if (!connected || paused || timeLeft <= -300) return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [connected, paused, timeLeft])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [transcript])

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    sessionRef.current?.setMuted(next)
  }

  const togglePause = () => {
    const next = !paused
    setPaused(next)
    // A sessão WebSocket continua viva; só paramos de enviar/tocar áudio.
    sessionRef.current?.setPaused(next)
  }

  const formatTime = (s: number) => {
    const neg = s < 0
    const abs = Math.abs(s)
    return `${neg ? '+' : ''}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
  }

  const overtime = timeLeft <= 0
  const lowTime = timeLeft > 0 && timeLeft < 300
  const totalBrl = formatBrl(previousCostUsd + voiceCost, settings.usdToBrl)

  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center gap-8 py-8 relative">
      <div className="w-full flex items-center justify-between">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold border ${
            overtime
              ? 'bg-red-600 text-white border-red-500 animate-pulse'
              : lowTime
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-200 border-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          {formatTime(timeLeft)}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono border border-slate-800">
          <DollarSign className="w-3.5 h-3.5" />
          {totalBrl} <span className="text-slate-600">(est.)</span>
        </div>
      </div>

      {/* Orbe do entrevistador */}
      <div className="relative my-4">
        {connected && !paused && <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-pulse-ring" />}
        <div
          className={`w-44 h-44 rounded-full flex items-center justify-center transition-transform duration-100 ${
            paused
              ? 'bg-gradient-to-br from-amber-500 to-amber-700 shadow-2xl shadow-amber-900/50'
              : connected
                ? 'bg-gradient-to-br from-indigo-500 to-violet-700 shadow-2xl shadow-indigo-900/60'
                : 'bg-slate-800'
          }`}
          style={{ transform: `scale(${1 + (paused ? 0 : Math.min(level * 2.5, 0.35))})` }}
        >
          {paused ? <Pause className="w-14 h-14 text-white/90" /> : <Mic className="w-14 h-14 text-white/90" />}
        </div>
        {connected && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            {!paused && <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-70" />}
            <span className={`relative rounded-full h-4 w-4 ${paused ? 'bg-amber-400' : 'bg-emerald-500'}`} />
          </span>
        )}
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold">
          {!connected ? 'Conectando…' : paused ? 'Entrevista pausada' : 'Entrevista em andamento'}
        </h2>
        <p className="text-slate-400 mt-1 text-sm max-w-md">
          {paused
            ? 'Pausado — o entrevistador não está te ouvindo e o tempo está congelado. Faça suas anotações e retome quando quiser.'
            : config.interviewLanguage === 'en-US'
              ? 'The interviewer is listening. Speak naturally in English.'
              : 'O entrevistador está te ouvindo. Fale naturalmente.'}
          {!paused && overtime && ' Tempo extra para finalizar.'}
        </p>
      </div>

      {error && (
        <Card className="p-5 border-red-500/40 bg-red-950/30 max-w-md text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-red-300 font-medium text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
          <Button variant="danger" onClick={() => void connect()}>
            <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Tentar novamente</span>
          </Button>
        </Card>
      )}

      {!error && (
        <div className="flex flex-wrap gap-4 justify-center items-center">
          <button
            onClick={toggleMute}
            disabled={paused}
            title={muted ? 'Reativar microfone' : 'Silenciar microfone'}
            className={`p-4 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              muted ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <Button
            onClick={togglePause}
            disabled={!connected}
            variant={paused ? 'primary' : 'secondary'}
            className="rounded-full px-6"
          >
            <span className="flex items-center gap-2">
              {paused ? <><Play className="w-5 h-5" /> Retomar</> : <><Pause className="w-5 h-5" /> Pausar</>}
            </span>
          </Button>
          <Button variant="danger" onClick={finish} className="rounded-full px-6">
            <span className="flex items-center gap-2"><PhoneOff className="w-5 h-5" /> Encerrar entrevista</span>
          </Button>
        </div>
      )}

      {/* Bloco de anotações — disponível durante a pausa */}
      {paused && (
        <Card className="w-full p-4 border-amber-500/30 bg-amber-950/10 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300/90">
            <NotebookPen className="w-4 h-4" /> Suas anotações
          </div>
          <textarea
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anote aqui o que quiser durante a pausa… (fica salvo enquanto a entrevista estiver aberta)"
            className="w-full h-32 resize-y bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </Card>
      )}

      <Card className="w-full p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Transcrição ao vivo
        </div>
        <div ref={logRef} className="h-56 overflow-y-auto p-4 space-y-3 text-sm">
          {transcript.length === 0 && <p className="text-slate-600 italic">Aguardando áudio…</p>}
          {transcript.map((t, i) => (
            <div key={i} className={`flex ${t.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-3.5 py-2 rounded-2xl ${
                  t.role === 'candidate'
                    ? 'bg-emerald-600/20 text-emerald-100 rounded-br-sm'
                    : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                }`}
              >
                <span className="block text-[10px] uppercase tracking-wider opacity-60 mb-0.5">
                  {t.role === 'candidate' ? 'Você' : 'Entrevistador'}
                </span>
                {t.text}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
