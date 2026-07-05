import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Bot, Clock, DollarSign, Mic2, Pause, PhoneOff, Play, RefreshCw } from 'lucide-react'
import { buildInterviewerPrompt } from '../config/prompts'
import { formatBrl, voiceCostUsd } from '../services/cost'
import { useSettings } from '../store'
import { startDualLiveSession } from '../voice/dualLive'
import { startSpectatorSession, type SpectatorPhase, type SpectatorSession } from '../voice/spectator'
import type { CompanyBrief, InterviewConfig, InterviewPlan, TranscriptEntry } from '../types'
import { Button, Card, Spinner } from './ui'

interface Props {
  config: InterviewConfig
  brief: CompanyBrief
  plan: InterviewPlan
  previousCostUsd: number
  onFinish: (transcript: TranscriptEntry[], sessionCost: number) => void
}

const PHASE_TEXT: Record<SpectatorPhase, string> = {
  connecting: 'Conectando as duas IAs…',
  'interviewer-speaking': 'O entrevistador está falando…',
  thinking: 'A candidata está pensando na resposta…',
  'candidate-speaking': 'A candidata está respondendo…',
  failed: 'A candidata falhou ao responder.',
  ended: 'Entrevista encerrada pelo entrevistador.',
}

/** Modo espectador: você ouve duas IAs conversando — entrevistador × candidata. */
export default function SpectatorInterview({ config, brief, plan, previousCostUsd, onFinish }: Props) {
  const settings = useSettings()
  const [phase, setPhase] = useState<SpectatorPhase>('connecting')
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(config.duration * 60)
  const [sessionCost, setSessionCost] = useState(0)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])

  const sessionRef = useRef<SpectatorSession | null>(null)
  const transcriptRef = useRef<TranscriptEntry[]>([])
  const audioSecondsRef = useRef({ input: 0, output: 0 })
  const candidateCostRef = useRef(0)
  const finishedRef = useRef(false)
  const logRef = useRef<HTMLDivElement>(null)

  const interviewerRef = settings.models.interviewer
  const candidateRef = settings.models.candidate
  const engine = settings.candidateEngine

  const totalSessionCost = useCallback(() => {
    return (
      voiceCostUsd(interviewerRef, audioSecondsRef.current.input, audioSecondsRef.current.output) +
      candidateCostRef.current
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    sessionRef.current?.stop()
    sessionRef.current = null
    onFinish(transcriptRef.current, totalSessionCost())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFinish])

  const connect = useCallback(async () => {
    setError(null)
    setPhase('connecting')
    sessionRef.current?.stop()

    if (!settings.keys.gemini?.trim()) {
      setError('Chave Google Gemini não configurada (Configurações → Chaves de API).')
      return
    }
    if (engine === 'text-tts' && !settings.keys.openrouter?.trim()) {
      setError('Chave OpenRouter não configurada — a IA Candidata precisa dela (Configurações → Chaves de API).')
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

    const opts = {
      config,
      keys: settings.keys,
      interviewerRef,
      candidateRef,
      systemInstruction,
      ttsModel: settings.candidateTtsModel,
      candidateVoice: settings.candidateVoice,
    }
    const callbacks = {
      onPhase: setPhase,
      onTranscript: (entry: TranscriptEntry) => {
        transcriptRef.current = [...transcriptRef.current, entry]
        setTranscript(transcriptRef.current)
      },
      onCandidateCost: (usd: number) => {
        candidateCostRef.current += usd
        setSessionCost(totalSessionCost())
      },
      onAudioSeconds: (inDelta: number, outDelta: number) => {
        audioSecondsRef.current.input += inDelta
        audioSecondsRef.current.output += outDelta
        setSessionCost(totalSessionCost())
      },
      onEndRequested: (delaySec: number) => {
        setTimeout(finish, (delaySec + 1.5) * 1000)
      },
      onError: (msg: string) => { if (!finishedRef.current) setError(msg) },
      onClose: () => {},
    }

    try {
      sessionRef.current = engine === 'gemini-live'
        ? await startDualLiveSession(opts, callbacks)
        : await startSpectatorSession(opts, callbacks)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao conectar')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => void connect(), 0)
    return () => {
      window.clearTimeout(id)
      sessionRef.current?.stop()
      sessionRef.current = null
    }
  }, [connect])

  // Timer com hard-stop: modo autônomo não pode rodar indefinidamente.
  useEffect(() => {
    if (paused || phase === 'connecting' || phase === 'ended') return
    if (timeLeft <= -300) {
      finish()
      return
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [paused, phase, timeLeft, finish])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [transcript])

  const togglePause = () => {
    const next = !paused
    setPaused(next)
    sessionRef.current?.setPaused(next)
  }

  const formatTime = (s: number) => {
    const neg = s < 0
    const abs = Math.abs(s)
    return `${neg ? '+' : ''}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
  }

  const overtime = timeLeft <= 0
  const lowTime = timeLeft > 0 && timeLeft < 300
  const totalBrl = formatBrl(previousCostUsd + sessionCost, settings.usdToBrl)
  const interviewerActive = !paused && phase === 'interviewer-speaking'
  const candidateActive = !paused && (phase === 'candidate-speaking' || phase === 'thinking')

  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center gap-6 py-8 relative">
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

      {/* Palco: entrevistador × candidata */}
      <div className="w-full grid grid-cols-2 gap-4 my-2">
        <Card
          className={`p-6 flex flex-col items-center gap-3 transition-all ${
            interviewerActive ? 'border-indigo-500/70 bg-indigo-950/30 shadow-lg shadow-indigo-900/30' : 'opacity-70'
          }`}
        >
          <div className="relative">
            {interviewerActive && <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-pulse-ring" />}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center">
              <Mic2 className="w-9 h-9 text-white/90" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">Entrevistador</p>
            <p className="text-[11px] text-slate-500">{config.voiceName} · Gemini Live</p>
          </div>
        </Card>

        <Card
          className={`p-6 flex flex-col items-center gap-3 transition-all ${
            candidateActive ? 'border-emerald-500/70 bg-emerald-950/30 shadow-lg shadow-emerald-900/30' : 'opacity-70'
          }`}
        >
          <div className="relative">
            {phase === 'candidate-speaking' && !paused && (
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-pulse-ring" />
            )}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center">
              {phase === 'thinking' ? <Spinner className="w-9 h-9 text-white/90" /> : <Bot className="w-9 h-9 text-white/90" />}
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">IA Candidata (você)</p>
            <p className="text-[11px] text-slate-500">
              {engine === 'gemini-live' ? `${settings.candidateVoice} · Live (experimental)` : `${settings.candidateVoice} · ${candidateRef.model.split('/').pop()}`}
            </p>
          </div>
        </Card>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold">{paused ? 'Entrevista pausada' : PHASE_TEXT[phase]}</h2>
        <p className="text-slate-400 mt-1 text-sm max-w-md">
          {paused
            ? 'Pausado — as duas IAs estão congeladas. Retome quando quiser.'
            : 'Modo espectador: a IA candidata responde por você usando o seu CV. Apenas ouça e aprenda.'}
          {!paused && overtime && ' Tempo extra para finalizar (encerra sozinho em até 5 min).'}
        </p>
      </div>

      {error && (
        <Card className="p-5 border-red-500/40 bg-red-950/30 max-w-md text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-red-300 font-medium text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {phase === 'failed' ? (
              <Button variant="danger" onClick={() => { setError(null); sessionRef.current?.retryCandidate() }}>
                <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Re-tentar resposta</span>
              </Button>
            ) : (
              <Button variant="danger" onClick={() => void connect()}>
                <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Reconectar</span>
              </Button>
            )}
          </div>
        </Card>
      )}

      {!error && (
        <div className="flex flex-wrap gap-4 justify-center items-center">
          <Button
            onClick={togglePause}
            disabled={phase === 'connecting' || phase === 'ended'}
            variant={paused ? 'primary' : 'secondary'}
            className="rounded-full px-6"
          >
            <span className="flex items-center gap-2">
              {paused ? <><Play className="w-5 h-5" /> Retomar</> : <><Pause className="w-5 h-5" /> Pausar</>}
            </span>
          </Button>
          <Button variant="danger" onClick={finish} className="rounded-full px-6">
            <span className="flex items-center gap-2"><PhoneOff className="w-5 h-5" /> Encerrar e gerar relatório</span>
          </Button>
        </div>
      )}

      <Card className="w-full p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Transcrição ao vivo
        </div>
        <div ref={logRef} className="h-64 overflow-y-auto p-4 space-y-3 text-sm">
          {transcript.length === 0 && <p className="text-slate-600 italic">Aguardando o início da conversa…</p>}
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
                  {t.role === 'candidate' ? 'IA Candidata' : 'Entrevistador'}
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
