import { lazy, Suspense, useState } from 'react'
import { BookOpen, BrainCircuit, CheckCircle2, Languages, Settings } from 'lucide-react'
import { runAnalyst, runPlanner, runResearcher } from './agents/agents'
import SetupForm from './components/SetupForm'
import { Badge, Button, Card, Spinner } from './components/ui'
import { modelInfo } from './config/models'
import { appCopy, formatAppError, UI_LANGUAGES } from './i18n'
import { formatBrl } from './services/cost'
import { useSettings } from './store'
import type {
  AppStep, CompanyBrief, InterviewConfig, InterviewPlan, ReportData, TranscriptEntry,
} from './types'

const LiveInterview = lazy(() => import('./components/LiveInterview'))
const SpectatorInterview = lazy(() => import('./components/SpectatorInterview'))
const ManualPanel = lazy(() => import('./components/ManualPanel'))
const ReportView = lazy(() => import('./components/ReportView'))
const SettingsPanel = lazy(() => import('./components/SettingsPanel'))

function LazyFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Spinner className="w-10 h-10 text-indigo-500" />
    </div>
  )
}

export default function App() {
  const settings = useSettings()
  const lang = settings.uiLanguage
  const t = appCopy[lang]
  const [step, setStep] = useState<AppStep>('setup')
  const [showSettings, setShowSettings] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [config, setConfig] = useState<InterviewConfig | null>(null)
  const [brief, setBrief] = useState<CompanyBrief | null>(null)
  const [plan, setPlan] = useState<InterviewPlan | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [analysisError, setAnalysisError] = useState<unknown | null>(null)
  const [loadingPhase, setLoadingPhase] = useState<'researcher' | 'planner' | 'analyst'>('researcher')
  const [errorText, setErrorText] = useState<unknown | null>(null)
  const [totalCostUsd, setTotalCostUsd] = useState(0)

  const handleStart = async (newConfig: InterviewConfig) => {
    setConfig(newConfig)
    setErrorText(null)
    setTotalCostUsd(0)
    setStep('preparing')
    try {
      setLoadingPhase('researcher')
      const research = await runResearcher(newConfig, settings.models.researcher, settings.keys)
      setBrief(research.data)
      setTotalCostUsd((c) => c + research.costUsd)

      setLoadingPhase('planner')
      const planResult = await runPlanner(newConfig, research.data, settings.models.planner, settings.keys)
      setPlan(planResult.data)
      setTotalCostUsd((c) => c + planResult.costUsd)

      setStep('ready')
    } catch (e) {
      setErrorText(e)
      setStep('setup')
    }
  }

  const handleInterviewFinish = async (finalTranscript: TranscriptEntry[], voiceCostUsd: number) => {
    setTranscript(finalTranscript)
    setTotalCostUsd((c) => c + voiceCostUsd)
    await analyze(finalTranscript)
  }

  // Geração do relatório isolada para poder ser re-tentada sem perder a entrevista.
  const analyze = async (finalTranscript: TranscriptEntry[]) => {
    setStep('analyzing')
    setAnalysisError(null)
    setLoadingPhase('analyst')
    try {
      if (!config || !plan) throw new Error('SESSION_STATE_LOST')
      const text = finalTranscript
        .map((entry) => `${entry.role === 'candidate' ? t.transcriptRoles.candidate : t.transcriptRoles.interviewer}: ${entry.text}`)
        .join('\n')
      const analysis = await runAnalyst(config, plan, text, settings.models.analyst, settings.keys)
      setReport(analysis.data)
      setTotalCostUsd((c) => c + analysis.costUsd)
      setStep('report')
    } catch (e) {
      // NÃO descarta a entrevista: mantém a transcrição e permite re-tentar.
      setAnalysisError(e)
    }
  }

  const copyTranscript = () => {
    const text = transcript
      .map((entry) => `${entry.role === 'candidate' ? t.transcriptRoles.you : t.transcriptRoles.interviewer}: ${entry.text}`)
      .join('\n')
    void navigator.clipboard?.writeText(text)
  }

  const handleRestart = () => {
    setStep('setup')
    setBrief(null)
    setPlan(null)
    setReport(null)
    setTranscript([])
    setTotalCostUsd(0)
    setErrorText(null)
    setAnalysisError(null)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 no-print">
        <div className="container mx-auto px-4 md:px-6 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-2">
          <div className="flex w-full sm:w-auto items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold leading-tight">Personal Interviewer <span className="text-indigo-400">Pro</span></h1>
              <p className="text-[11px] text-slate-500 leading-tight">{t.headerSubtitle}</p>
            </div>
          </div>
          <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2 sm:gap-3">
            <Badge tone="slate">{t.steps[step]}</Badge>
            <div className="flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-800 px-1.5 py-1" title={t.languageButton}>
              <Languages className="w-4 h-4 text-slate-400" />
              {UI_LANGUAGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => settings.setUiLanguage(item.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    lang === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  aria-label={`${t.languageButton}: ${item.label}`}
                >
                  {item.short}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowManual(true)}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 hover:text-indigo-300 text-slate-300 transition-colors"
              title={t.openManual}
            >
              <BookOpen className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 text-slate-300 transition-colors"
              title={t.openSettings}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        {errorText !== null && step === 'setup' && (
          <div className="max-w-4xl mx-auto mb-6">
            <Card className="p-4 border-red-500/40 bg-red-950/30 text-sm text-red-300">
              {formatAppError(errorText, lang, t.errors.preparing)}
            </Card>
          </div>
        )}

        {step === 'setup' && <SetupForm onStart={(c) => void handleStart(c)} />}

        {step === 'preparing' && (
          <div className="flex flex-col items-center justify-center min-h-[55vh] gap-5">
            <Spinner className="w-14 h-14 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-200 animate-pulse">{t.loading[loadingPhase]}</h2>
            <p className="text-xs text-slate-500">
              {t.loading.accumulatedCost} {formatBrl(totalCostUsd, settings.usdToBrl)} {t.loading.estimated}
            </p>
          </div>
        )}

        {step === 'analyzing' && !analysisError && (
          <div className="flex flex-col items-center justify-center min-h-[55vh] gap-5">
            <Spinner className="w-14 h-14 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-200 animate-pulse">{t.loading[loadingPhase]}</h2>
            <p className="text-xs text-slate-500">
              {t.loading.accumulatedCost} {formatBrl(totalCostUsd, settings.usdToBrl)} {t.loading.estimated}
            </p>
          </div>
        )}

        {step === 'analyzing' && analysisError !== null && (
          <div className="max-w-xl mx-auto py-12 text-center space-y-6">
            <div className="bg-amber-500/15 border border-amber-500/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <BrainCircuit className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t.errors.reportFailedTitle}</h2>
              <p className="text-slate-400 mt-2 text-sm">
                {t.errors.reportFailedBody} ({transcript.length})
              </p>
            </div>
            <Card className="p-4 border-amber-500/30 bg-amber-950/20 text-left text-xs text-amber-200/90 break-words">
              {formatAppError(analysisError, lang, t.errors.analyzing)}
            </Card>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={() => void analyze(transcript)}>{t.errors.retryReport}</Button>
              <Button variant="secondary" onClick={copyTranscript}>{t.errors.copyTranscript}</Button>
              <Button variant="ghost" onClick={handleRestart}>{t.errors.backStart}</Button>
            </div>
          </div>
        )}

        {step === 'ready' && config && brief && plan && (
          <div className="max-w-2xl mx-auto text-center space-y-7 py-10">
            <div className="bg-emerald-500/15 border border-emerald-500/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">{t.ready.title}</h2>
              <p className="text-slate-400 mt-2">
                {t.ready.company} <strong className="text-slate-200">{brief.company_identification?.company_name || t.ready.inferredCompany}</strong>
                <br />
                {t.ready.planLevel} <strong className="text-indigo-400 capitalize">{plan.metadata?.seniority_inferred?.level || t.ready.defaultLevel}</strong>
                {' · '}{config.duration} min{' · '}
                {config.interviewLanguage === 'en-US' ? `🇺🇸 ${t.ready.english}` : `🇧🇷 ${t.ready.portuguese}`}
              </p>
            </div>
            <Card className="p-5 text-left text-sm space-y-1.5">
              <p className="text-slate-300"><strong>{t.ready.tone}:</strong> {brief.interview_style_profile?.tone || t.ready.neutral}</p>
              <p className="text-slate-300"><strong>{t.ready.strictness}:</strong> {brief.interview_style_profile?.strictness_level ?? '?'}/5</p>
              <p className="text-slate-300"><strong>{t.ready.voice}:</strong> {config.voiceName} · <strong>{t.ready.engine}:</strong> {modelInfo(settings.models.interviewer)?.label}</p>
              {config.candidateMode === 'ai' && (
                <p className="text-emerald-300">
                  <strong>{t.ready.spectator}:</strong> {settings.candidateEngine === 'gemini-live'
                    ? t.ready.dualLive
                    : settings.models.candidate.model.split('/').pop()}
                </p>
              )}
              <p className="text-slate-300"><strong>{t.ready.blocks}:</strong> {plan.interview_plan.blocks.map((b) => b.name).join(' -> ')}</p>
              <p className="text-xs text-slate-500 pt-1">{t.ready.prepCost} {formatBrl(totalCostUsd, settings.usdToBrl)} {t.loading.estimated}</p>
            </Card>
            <Button onClick={() => setStep('interview')} className="px-10 py-4 text-lg rounded-full">
              {t.ready.start}
            </Button>
          </div>
        )}

        {step === 'interview' && config && brief && plan && (
          <Suspense fallback={<LazyFallback />}>
            {config.candidateMode === 'ai' ? (
              <SpectatorInterview
                config={config}
                brief={brief}
                plan={plan}
                previousCostUsd={totalCostUsd}
                onFinish={(entries, cost) => void handleInterviewFinish(entries, cost)}
              />
            ) : (
              <LiveInterview
                config={config}
                brief={brief}
                plan={plan}
                previousCostUsd={totalCostUsd}
                onFinish={(entries, cost) => void handleInterviewFinish(entries, cost)}
              />
            )}
          </Suspense>
        )}

        {step === 'report' && report && (
          <Suspense fallback={<LazyFallback />}>
            <ReportView
              data={report}
              transcript={transcript}
              totalCostUsd={totalCostUsd}
              candidateLabel={config?.candidateMode === 'ai' ? t.transcriptRoles.candidate : undefined}
              onRestart={handleRestart}
            />
          </Suspense>
        )}
      </main>

      {showManual && (
        <Suspense fallback={null}>
          <ManualPanel onClose={() => setShowManual(false)} />
        </Suspense>
      )}
      {showSettings && (
        <Suspense fallback={null}>
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </Suspense>
      )}
    </div>
  )
}
