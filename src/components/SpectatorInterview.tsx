import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Bot, Clock, DollarSign, Mic2, Pause, PhoneOff, Play, RefreshCw } from 'lucide-react'
import { modelInfo } from '../config/models'
import { buildInterviewerPrompt } from '../config/prompts'
import { formatAppError, spectatorCopy } from '../i18n'
import { addVoiceUsage, emptyVoiceUsage, formatBrl, voiceCostUsd } from '../services/cost'
import { useSettings, type SettingsState } from '../store'
import type { CompanyBrief, InterviewConfig, InterviewPlan, ModelRef, TranscriptEntry, VoiceUsage } from '../types'
import { getVoiceBrokerStatus } from '../voice/broker'
import { startDualLiveSession } from '../voice/dualLive'
import { startSpectatorSession, type SpectatorPhase, type SpectatorSession } from '../voice/spectator'
import { Button, Card, Spinner } from './ui'

interface Props {
  config: InterviewConfig
  brief: CompanyBrief
  plan: InterviewPlan
  previousCostUsd: number
  onFinish: (transcript: TranscriptEntry[], sessionCost: number) => void
}

interface LatestConnectContext {
  settings: SettingsState
  config: InterviewConfig
  brief: CompanyBrief
  plan: InterviewPlan
  interviewerRef: ModelRef
  candidateRef: ModelRef
  engine: SettingsState['candidateEngine']
}

/** Modo espectador: você ouve duas IAs conversando — entrevistador × candidata. */
export default function SpectatorInterview({ config, brief, plan, previousCostUsd, onFinish }: Props) {
  const settings = useSettings()
  const t = spectatorCopy[settings.uiLanguage]
  const [phase, setPhase] = useState<SpectatorPhase>('connecting')
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(config.duration * 60)
  const [sessionCost, setSessionCost] = useState(0)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])

  const sessionRef = useRef<SpectatorSession | null>(null)
  const transcriptRef = useRef<TranscriptEntry[]>([])
  const voiceUsageRef = useRef<VoiceUsage>(emptyVoiceUsage())
  const candidateCostRef = useRef(0)
  const finishedRef = useRef(false)
  const logRef = useRef<HTMLDivElement>(null)
  const finishRef = useRef<() => void>(() => {})

  const interviewerRef = settings.models.interviewer
  const candidateRef = settings.models.candidate
  const engine = settings.candidateEngine
  const activeInterviewerRef = useRef<ModelRef>(interviewerRef)
  const latestConnectRef = useRef<LatestConnectContext>({
    settings,
    config,
    brief,
    plan,
    interviewerRef,
    candidateRef,
    engine,
  })

  useEffect(() => {
    latestConnectRef.current = {
      settings,
      config,
      brief,
      plan,
      interviewerRef,
      candidateRef,
      engine,
    }
  }, [settings, config, brief, plan, interviewerRef, candidateRef, engine])

  const totalSessionCost = useCallback(() => {
    return (
      voiceCostUsd(activeInterviewerRef.current, voiceUsageRef.current) +
      candidateCostRef.current
    )
  }, [])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    sessionRef.current?.stop()
    sessionRef.current = null
    onFinish(transcriptRef.current, totalSessionCost())
  }, [onFinish, totalSessionCost])

  useEffect(() => {
    finishRef.current = finish
  }, [finish])

  const connect = useCallback(async () => {
    const latest = latestConnectRef.current
    const {
      settings: currentSettings,
      config: currentConfig,
      brief: currentBrief,
      plan: currentPlan,
      interviewerRef: currentInterviewerRef,
      candidateRef: currentCandidateRef,
      engine: currentEngine,
    } = latest

    setError(null)
    setPhase('connecting')
    sessionRef.current?.stop()

    let brokerStatus
    try {
      brokerStatus = await getVoiceBrokerStatus()
    } catch {
      setError(t.brokerUnavailable)
      return
    }
    if (!brokerStatus.gemini) {
      setError(t.missingGemini)
      return
    }
    if (currentInterviewerRef.provider === 'openai' && !brokerStatus.openai) {
      setError(t.missingOpenAi)
      return
    }
    if (currentEngine === 'gemini-live' && currentInterviewerRef.provider !== 'gemini') {
      setError(t.dualRequiresGemini)
      return
    }
    if (currentEngine === 'text-tts' && !currentSettings.keys.openrouter?.trim()) {
      setError(t.missingOpenRouter)
      return
    }

    activeInterviewerRef.current = currentInterviewerRef
    const systemInstruction = buildInterviewerPrompt({
      template: currentSettings.interviewerTemplate,
      language: currentConfig.interviewLanguage,
      durationMinutes: currentConfig.duration,
      companyBrief: currentBrief.company_brief,
      styleProfile: currentBrief.interview_style_profile,
      plan: currentPlan.interview_plan,
      stressMode: currentConfig.stressMode,
      extraInstructions: currentSettings.extraInstructions,
    })

    const opts = {
      config: currentConfig,
      keys: currentSettings.keys,
      interviewerRef: currentInterviewerRef,
      candidateRef: currentCandidateRef,
      systemInstruction,
      ttsModel: currentSettings.candidateTtsModel,
      candidateVoice: currentSettings.candidateVoice,
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
      onUsage: (delta: VoiceUsage) => {
        voiceUsageRef.current = addVoiceUsage(voiceUsageRef.current, delta)
        setSessionCost(totalSessionCost())
      },
      onEndRequested: (delaySec: number) => {
        setTimeout(() => finishRef.current(), (delaySec + 1.5) * 1000)
      },
      onError: (msg: string) => {
        if (!finishedRef.current) setError(formatAppError(msg, currentSettings.uiLanguage, t.connectFailed))
      },
      onClose: () => {},
    }

    try {
      sessionRef.current = currentEngine === 'gemini-live'
        ? await startDualLiveSession(opts, callbacks)
        : await startSpectatorSession(opts, callbacks)
    } catch (e) {
      setError(formatAppError(e, currentSettings.uiLanguage, t.connectFailed))
    }
  }, [t, totalSessionCost])

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
          {totalBrl} <span className="text-slate-600">{t.estimated}</span>
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
            <p className="font-semibold text-sm">{t.interviewer}</p>
            <p className="text-[11px] text-slate-500">{config.voiceName} · {modelInfo(interviewerRef)?.label}</p>
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
            <p className="font-semibold text-sm">{t.aiCandidate}</p>
            <p className="text-[11px] text-slate-500">
              {engine === 'gemini-live' ? `${settings.candidateVoice} · ${t.liveExperimental}` : `${settings.candidateVoice} · ${candidateRef.model.split('/').pop()}`}
            </p>
          </div>
        </Card>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold">{paused ? t.pausedTitle : t.phases[phase]}</h2>
        <p className="text-slate-400 mt-1 text-sm max-w-md">
          {paused
            ? t.pausedBody
            : t.body}
          {!paused && overtime && ` ${t.overtime}`}
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
                <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> {t.retryAnswer}</span>
              </Button>
            ) : (
              <Button variant="danger" onClick={() => void connect()}>
                <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> {t.reconnect}</span>
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
              {paused ? <><Play className="w-5 h-5" /> {t.resume}</> : <><Pause className="w-5 h-5" /> {t.pause}</>}
            </span>
          </Button>
          <Button variant="danger" onClick={finish} className="rounded-full px-6">
            <span className="flex items-center gap-2"><PhoneOff className="w-5 h-5" /> {t.finish}</span>
          </Button>
        </div>
      )}

      <Card className="w-full p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {t.liveTranscript}
        </div>
        <div ref={logRef} className="h-64 overflow-y-auto p-4 space-y-3 text-sm">
          {transcript.length === 0 && <p className="text-slate-600 italic">{t.waiting}</p>}
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
                  {t.role === 'candidate' ? spectatorCopy[settings.uiLanguage].aiCandidateShort : spectatorCopy[settings.uiLanguage].interviewer}
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
