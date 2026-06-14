import { useState } from 'react'
import { BrainCircuit, CheckCircle2, Settings } from 'lucide-react'
import { runAnalyst, runPlanner, runResearcher } from './agents/agents'
import LiveInterview from './components/LiveInterview'
import ReportView from './components/ReportView'
import SettingsPanel from './components/SettingsPanel'
import SetupForm from './components/SetupForm'
import { Badge, Button, Card, Spinner } from './components/ui'
import { modelInfo } from './config/models'
import { formatBrl } from './services/cost'
import { useSettings } from './store'
import type {
  AppStep, CompanyBrief, InterviewConfig, InterviewPlan, ReportData, TranscriptEntry,
} from './types'

const STEP_LABELS: Record<AppStep, string> = {
  setup: 'Configuração',
  preparing: 'Preparando',
  ready: 'Pronto',
  interview: 'Entrevista',
  analyzing: 'Analisando',
  report: 'Relatório',
}

export default function App() {
  const settings = useSettings()
  const [step, setStep] = useState<AppStep>('setup')
  const [showSettings, setShowSettings] = useState(false)
  const [config, setConfig] = useState<InterviewConfig | null>(null)
  const [brief, setBrief] = useState<CompanyBrief | null>(null)
  const [plan, setPlan] = useState<InterviewPlan | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [loadingText, setLoadingText] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [totalCostUsd, setTotalCostUsd] = useState(0)

  const handleStart = async (newConfig: InterviewConfig) => {
    setConfig(newConfig)
    setErrorText(null)
    setTotalCostUsd(0)
    setStep('preparing')
    try {
      setLoadingText('Agente Pesquisador analisando a empresa e a vaga…')
      const research = await runResearcher(newConfig, settings.models.researcher, settings.keys)
      setBrief(research.data)
      setTotalCostUsd((c) => c + research.costUsd)

      setLoadingText('Agente Planejador criando o roteiro adaptativo…')
      const planResult = await runPlanner(newConfig, research.data, settings.models.planner, settings.keys)
      setPlan(planResult.data)
      setTotalCostUsd((c) => c + planResult.costUsd)

      setStep('ready')
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : 'Erro ao preparar a entrevista.')
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
    setLoadingText('Agente Analista auditando a transcrição e gerando o relatório…')
    try {
      if (!config || !plan) throw new Error('Estado da sessão perdido.')
      const text = finalTranscript
        .map((t) => `${t.role === 'candidate' ? 'Candidato' : 'Entrevistador'}: ${t.text}`)
        .join('\n')
      const analysis = await runAnalyst(config, plan, text, settings.models.analyst, settings.keys)
      setReport(analysis.data)
      setTotalCostUsd((c) => c + analysis.costUsd)
      setStep('report')
    } catch (e) {
      // NÃO descarta a entrevista: mantém a transcrição e permite re-tentar.
      setAnalysisError(e instanceof Error ? e.message : 'Erro ao gerar o relatório.')
    }
  }

  const copyTranscript = () => {
    const text = transcript
      .map((t) => `${t.role === 'candidate' ? 'Você' : 'Entrevistador'}: ${t.text}`)
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
        <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold leading-tight">Personal Interviewer <span className="text-indigo-400">Pro</span></h1>
              <p className="text-[11px] text-slate-500 leading-tight">Simulador de entrevistas por voz · pt-BR & EN</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="slate">{STEP_LABELS[step]}</Badge>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 text-slate-300 transition-colors"
              title="Configurações (chaves, modelos, prompt)"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        {errorText && step === 'setup' && (
          <div className="max-w-4xl mx-auto mb-6">
            <Card className="p-4 border-red-500/40 bg-red-950/30 text-sm text-red-300">{errorText}</Card>
          </div>
        )}

        {step === 'setup' && <SetupForm onStart={(c) => void handleStart(c)} />}

        {step === 'preparing' && (
          <div className="flex flex-col items-center justify-center min-h-[55vh] gap-5">
            <Spinner className="w-14 h-14 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-200 animate-pulse">{loadingText}</h2>
            <p className="text-xs text-slate-500">
              Custo acumulado: {formatBrl(totalCostUsd, settings.usdToBrl)} (est.)
            </p>
          </div>
        )}

        {step === 'analyzing' && !analysisError && (
          <div className="flex flex-col items-center justify-center min-h-[55vh] gap-5">
            <Spinner className="w-14 h-14 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-200 animate-pulse">{loadingText}</h2>
            <p className="text-xs text-slate-500">
              Custo acumulado: {formatBrl(totalCostUsd, settings.usdToBrl)} (est.)
            </p>
          </div>
        )}

        {step === 'analyzing' && analysisError && (
          <div className="max-w-xl mx-auto py-12 text-center space-y-6">
            <div className="bg-amber-500/15 border border-amber-500/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <BrainCircuit className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Falha ao gerar o relatório</h2>
              <p className="text-slate-400 mt-2 text-sm">
                Sua entrevista <strong className="text-slate-200">não foi perdida</strong> — a transcrição
                ({transcript.length} turnos) está salva. Você pode tentar gerar o relatório de novo ou copiar
                a transcrição para guardar.
              </p>
            </div>
            <Card className="p-4 border-amber-500/30 bg-amber-950/20 text-left text-xs text-amber-200/90 break-words">
              {analysisError}
            </Card>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={() => void analyze(transcript)}>Tentar gerar relatório novamente</Button>
              <Button variant="secondary" onClick={copyTranscript}>Copiar transcrição</Button>
              <Button variant="ghost" onClick={handleRestart}>Voltar ao início</Button>
            </div>
          </div>
        )}

        {step === 'ready' && config && brief && plan && (
          <div className="max-w-2xl mx-auto text-center space-y-7 py-10">
            <div className="bg-emerald-500/15 border border-emerald-500/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Tudo pronto!</h2>
              <p className="text-slate-400 mt-2">
                Empresa identificada: <strong className="text-slate-200">{brief.company_identification?.company_name || 'inferida do JD'}</strong>
                <br />
                Roteiro de nível <strong className="text-indigo-400 capitalize">{plan.metadata?.seniority_inferred?.level || 'padrão'}</strong>
                {' · '}{config.duration} min{' · '}
                {config.interviewLanguage === 'en-US' ? '🇺🇸 inglês' : '🇧🇷 português'}
              </p>
            </div>
            <Card className="p-5 text-left text-sm space-y-1.5">
              <p className="text-slate-300"><strong>Tom:</strong> {brief.interview_style_profile?.tone || 'Neutro'}</p>
              <p className="text-slate-300"><strong>Rigor:</strong> {brief.interview_style_profile?.strictness_level ?? '?'}/5</p>
              <p className="text-slate-300"><strong>Voz:</strong> {config.voiceName} · <strong>Engine:</strong> {modelInfo(settings.models.interviewer)?.label}</p>
              <p className="text-slate-300"><strong>Blocos:</strong> {plan.interview_plan.blocks.map((b) => b.name).join(' → ')}</p>
              <p className="text-xs text-slate-500 pt-1">Custo de preparação: {formatBrl(totalCostUsd, settings.usdToBrl)} (est.)</p>
            </Card>
            <Button onClick={() => setStep('interview')} className="px-10 py-4 text-lg rounded-full">
              🎙️ Começar entrevista
            </Button>
          </div>
        )}

        {step === 'interview' && config && brief && plan && (
          <LiveInterview
            config={config}
            brief={brief}
            plan={plan}
            previousCostUsd={totalCostUsd}
            onFinish={(t, cost) => void handleInterviewFinish(t, cost)}
          />
        )}

        {step === 'report' && report && (
          <ReportView data={report} transcript={transcript} totalCostUsd={totalCostUsd} onRestart={handleRestart} />
        )}
      </main>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}
