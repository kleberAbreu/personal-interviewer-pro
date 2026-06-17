import { useEffect, useState } from 'react'
import { Briefcase, FileText, Flame, Globe2, Mic2, Rocket, SlidersHorizontal, Timer } from 'lucide-react'
import { voicesForProvider } from '../config/models'
import { useSettings } from '../store'
import type { Area, InterviewConfig, InterviewType, Language, Weights } from '../types'
import { Button, Card, Field, SectionTitle, inputCls } from './ui'

const AREAS: Area[] = ['Software', 'Produto', 'Dados', 'Comercial', 'Outra']
const TYPES: InterviewType[] = ['RH', 'Tecnica', 'Case', 'Mista']
const DRAFT_KEY = 'pip-setup-draft-v1'

const DEFAULT_WEIGHTS: Weights = { communication: 20, technical: 30, cultureFit: 15, structure: 15, depth: 20 }

const WEIGHT_LABELS: Record<keyof Weights, string> = {
  communication: 'Comunicação',
  technical: 'Técnico',
  cultureFit: 'Culture Fit',
  structure: 'Estrutura (STAR)',
  depth: 'Profundidade',
}

function loadDraft(): Partial<InterviewConfig> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export default function SetupForm({ onStart }: { onStart: (config: InterviewConfig) => void }) {
  const interviewerProvider = useSettings((s) => s.models.interviewer.provider)
  const voices = voicesForProvider(interviewerProvider)
  const draft = loadDraft()

  const [area, setArea] = useState<Area>(draft.area ?? 'Software')
  const [customArea, setCustomArea] = useState(draft.customArea ?? '')
  const [interviewType, setInterviewType] = useState<InterviewType>(draft.interviewType ?? 'Mista')
  const [interviewLanguage, setInterviewLanguage] = useState<Language>(draft.interviewLanguage ?? 'pt-BR')
  const [feedbackLanguage, setFeedbackLanguage] = useState<Language>(draft.feedbackLanguage ?? 'pt-BR')
  const [stressMode, setStressMode] = useState(draft.stressMode ?? false)
  const [voiceName, setVoiceName] = useState(draft.voiceName && voices.includes(draft.voiceName) ? draft.voiceName : voices[0])
  const [duration, setDuration] = useState<15 | 30 | 45>(draft.duration ?? 30)
  const [weights, setWeights] = useState<Weights>(draft.weights ?? DEFAULT_WEIGHTS)
  const [jobDescription, setJobDescription] = useState(draft.jobDescription ?? '')
  const [cvText, setCvText] = useState(draft.cvText ?? '')

  // Voz precisa pertencer ao engine atual: derivamos em render em vez de corrigir
  // por efeito (evita setState síncrono em useEffect / cascading renders).
  const selectedVoiceName = voices.includes(voiceName) ? voiceName : voices[0]

  const config: InterviewConfig = {
    area, customArea: customArea || undefined, interviewType,
    interviewLanguage, feedbackLanguage, stressMode, voiceName: selectedVoiceName,
    duration, weights, jobDescription, cvText,
  }

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(config))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, customArea, interviewType, interviewLanguage, feedbackLanguage, stressMode, voiceName, duration, weights, jobDescription, cvText])

  const canStart = jobDescription.trim().length > 30

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center py-6">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-300 via-white to-emerald-300 bg-clip-text text-transparent">
          Treine a entrevista dos seus sonhos
        </h2>
        <p className="text-slate-400 mt-3 max-w-xl mx-auto">
          Cole a vaga, escolha o idioma e converse por voz com um entrevistador de IA.
          No final, receba um relatório crítico com evidências e plano de treino.
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <SectionTitle icon={<Briefcase className="w-4 h-4" />}>Vaga e contexto</SectionTitle>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Área">
            <select className={inputCls} value={area} onChange={(e) => setArea(e.target.value as Area)}>
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Tipo de entrevista">
            <select className={inputCls} value={interviewType} onChange={(e) => setInterviewType(e.target.value as InterviewType)}>
              {TYPES.map((t) => <option key={t} value={t}>{t === 'Tecnica' ? 'Técnica' : t}</option>)}
            </select>
          </Field>
        </div>
        {area === 'Outra' && (
          <Field label="Qual área?">
            <input className={inputCls} value={customArea} onChange={(e) => setCustomArea(e.target.value)} placeholder="Ex.: Marketing, Jurídico…" />
          </Field>
        )}
        <Field label="Descrição da vaga (JD)" hint="Cole o texto completo do anúncio. Quanto mais contexto, melhor o roteiro.">
          <textarea
            className={`${inputCls} h-36 resize-y`}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Cole aqui a descrição da vaga…"
          />
        </Field>
        <Field label="Seu CV (opcional)" hint="Usado como contexto pelo entrevistador e pelo analista — nunca para pontuar o que você não disse.">
          <textarea
            className={`${inputCls} h-28 resize-y`}
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Cole o texto do seu currículo…"
          />
        </Field>
      </Card>

      <Card className="p-6 space-y-6">
        <SectionTitle icon={<Globe2 className="w-4 h-4" />}>Idioma e voz</SectionTitle>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Idioma da entrevista" hint="Treinar em inglês? O entrevistador conduz tudo em inglês nativo.">
            <div className="grid grid-cols-2 gap-2">
              {(['pt-BR', 'en-US'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setInterviewLanguage(lang)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    interviewLanguage === lang
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-950/60 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {lang === 'pt-BR' ? '🇧🇷 Português' : '🇺🇸 English'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Idioma do relatório" hint="O feedback pode vir em português mesmo com entrevista em inglês.">
            <select className={inputCls} value={feedbackLanguage} onChange={(e) => setFeedbackLanguage(e.target.value as Language)}>
              <option value="pt-BR">Português (BR)</option>
              <option value="en-US">English (US)</option>
            </select>
          </Field>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Voz do entrevistador">
            <div className="relative">
              <Mic2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select className={`${inputCls} pl-9`} value={selectedVoiceName} onChange={(e) => setVoiceName(e.target.value)}>
                {voices.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Duração">
            <div className="relative">
              <Timer className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select className={`${inputCls} pl-9`} value={duration} onChange={(e) => setDuration(Number(e.target.value) as 15 | 30 | 45)}>
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
              </select>
            </div>
          </Field>
          <Field label="Modo stress" hint="Entrevistador cético que pressiona por justificativas.">
            <button
              type="button"
              onClick={() => setStressMode(!stressMode)}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                stressMode
                  ? 'bg-red-600/20 border-red-500/50 text-red-300'
                  : 'bg-slate-950/60 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <Flame className="w-4 h-4" />
              {stressMode ? 'Ativado' : 'Desativado'}
            </button>
          </Field>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <SectionTitle icon={<SlidersHorizontal className="w-4 h-4" />}>Pesos da avaliação</SectionTitle>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
          {(Object.keys(weights) as Array<keyof Weights>).map((k) => (
            <div key={k}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">{WEIGHT_LABELS[k]}</span>
                <span className="text-indigo-400 font-mono">{weights[k]}%</span>
              </div>
              <input
                type="range" min={0} max={50} step={5}
                value={weights[k]}
                onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-center pb-10">
        <Button onClick={() => onStart(config)} disabled={!canStart} className="px-10 py-4 text-base rounded-full">
          <span className="flex items-center gap-2">
            <Rocket className="w-5 h-5" />
            Preparar entrevista
          </span>
        </Button>
      </div>
      {!canStart && (
        <p className="text-center text-xs text-slate-500 -mt-8 pb-6 flex items-center justify-center gap-1">
          <FileText className="w-3 h-3" /> Cole a descrição da vaga para começar.
        </p>
      )}
    </div>
  )
}
